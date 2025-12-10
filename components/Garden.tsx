/**
 * Garden Component for LoveWidgets
 * 2.5D "Stage Perspective" layout with depth simulation
 * Flowers are scattered on a surface with front/back depth
 * 
 * Growth Stages (varies by plant type):
 * - Flowers: sapling < 30 minutes, mature >= 30 minutes
 * - Large plants: sapling < 6 hours, mature >= 6 hours
 * - Trees: sapling < 12 hours, mature >= 12 hours
 */

import {
  FlowerType,
  FlowerVariant,
  HealthStatus,
  getDecorAsset,
  getFenceAsset,
  getFlowerAsset,
  getGroundAsset,
  getGroundFrontAsset,
  getLandmarkAsset,
  getPlantCategory,
  getSaplingAsset,
  hasAsset,
} from '@/constants/Assets';
import { Colors } from '@/constants/Colors';
import { FlowerTypeId } from '@/constants/FlowerMarket';
import { useTheme } from '@/context/ThemeContext';
import {
  COLLISION_RADIUS_MULTIPLIERS,
  FlowerHealth,
  LandmarkTypeId,
  PlantedDecor,
  PlantedFlower,
  PlantedLandmark,
  canPlaceDecor,
  canPlaceFlower,
  getDecorCollisionRadius,
  getGrowthScale,
  getGrowthStage,
  getReducedCollisionRadius
} from '@/utils/gardenState';
import * as Haptics from 'expo-haptics';
import { AlertCircle, Check, Droplets, FlipHorizontal, Wrench, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { SplashAnimation } from './Garden/SplashAnimation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Layout constants
const GROUND_SURFACE_HEIGHT = 62; // Increased from 50 by ~24% for more depth
const GROUND_FRONT_HEIGHT = 62; // Increased from 50 by ~24% for more depth
const FLOWER_AREA_HEIGHT = 196; // Increased from 160 by ~22.5% for more vertical room
const HORIZONTAL_PADDING = 20;
const HORIZON_Y = 50; // Y position at horizon line (back edge of flower area, where landmarks sit)

// ============================================
// TYPES
// ============================================

interface GardenProps {
  flowers: PlantedFlower[]; // Individual planted flowers with growth data
  decor?: PlantedDecor[]; // Individual decor items in the garden (behave like plants but no sapling)
  landmarks?: PlantedLandmark[]; // Individual landmarks in the garden
  flowerCount: number; // Total level (for display)
  health: FlowerHealth;
  streakProgress: number;
  water?: number; // Current water amount
  onWater?: () => void; // Callback when watering can is pressed
  onWaterBlocked?: () => void; // Callback when watering can is pressed but blocked (cooldown)
  harmonyState?: 'wilt' | 'normal' | 'harmony'; // UI state based on watering
  canWater?: boolean; // True if user can water (6-hour cooldown check)
  onRevive?: () => void; // Callback when revive button is pressed (garden is wilted)
  // Dev tools
  devGrowthStage?: 'sapling' | 'mature'; // Override growth stage for all flowers
  devHealth?: 'fresh' | 'wilting' | 'wilted'; // Override health for all flowers
  onDevGrowthStageChange?: (stage: 'sapling' | 'mature' | null) => void;
  onDevHealthChange?: (health: 'fresh' | 'wilting' | 'wilted' | null) => void;
  newlyPlantedFlowerId?: string; // ID of newly planted flower to animate
  // Dev tool actions
  onDevRemoveLastFlower?: () => void;
  onDevAddRose?: () => void;
  onDevRemoveAllFlowers?: () => void;
  onDevAddCoins?: () => void;
  onDevRemoveAllLandmarks?: () => void;
  onDevResetQuestion?: () => void;
  onDevShowPremiumModal?: () => void;
  // Planting mode
  isPlantingMode?: boolean;
  pendingItem?: { type: string; cost: number; category?: 'flower' | 'decor' | 'landmark' } | null;
  onPlaceConfirm?: (x: number, y: number, flipped?: boolean) => Promise<void>;
  onPlaceCancel?: () => void;
  // Landmark editing
  isEditingLandmarks?: boolean;
  onEditLandmarksDone?: () => void;
  onLandmarkUpdate?: (landmarkId: string, x: number, y: number) => Promise<void>;
  onLandmarkDelete?: (landmarkId: string) => Promise<void>;
  onLandmarkMoveToFront?: (landmarkId: string) => Promise<void>;
  onLandmarkMoveToBack?: (landmarkId: string) => Promise<void>;
}

interface FlowerProps {
  flower: PlantedFlower; // Individual flower data
  health: HealthStatus;
  slotIndex: number;
  depthPosition: 'front' | 'back'; // Kept for backward compatibility, but scale is calculated from bottomY
  bottomY: number; // Y coordinate (bottom value) for smooth depth scaling
  bounceScale?: ReturnType<typeof useSharedValue<number>>;
}

// ============================================
// FLOWER SIZE CONFIGURATION
// ============================================
// Individual scale factors for each flower type
// Adjust the scale value to resize each flower independently
// Base dimensions maintain aspect ratios, scale factors control size

const FLOWER_SCALE_FACTORS: Record<FlowerType, number> = {
  rose: 0.8,
  tulip: 0.8,
  morning_glory: 0.8,
  pumpkin: 1.0,
  apple_tree: 1.3,
  watermelon: 1.0,
  orchid: 1.0,
  strawberry: 0.7,
};

// ============================================
// DECOR DIMENSIONS AND SCALE CONFIGURATION
// ============================================
// Base dimensions for each decor type
// Adjust these to change the size of decor items

export const DECOR_BASE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  birdbath: { width: 64, height: 64 }, // Adjust these values to change birdbath size
  garden_gnome: { width: 48, height: 64 }, // Adjust these values to change garden gnome size
  pink_flamingo: { width: 48, height: 80 }, // Adjust these values to change pink flamingo size
  pond: { width: 96, height: 64 }, // Adjust these values to change pond size
  telescope: { width: 48, height: 80 }, // Adjust these values to change telescope size
  campfire: { width: 64, height: 64 }, // Adjust these values to change campfire size
  lawnchair: { width: 48, height: 64 }, // Adjust these values to change lawn chair size
  // Add more decor types here as you add them:
  // fountain: { width: 80, height: 80 },
};

// Scale factors for each decor type (multiplies base dimensions)
// Use this for fine-tuning size without changing base dimensions
export const DECOR_SCALE_FACTORS: Record<string, number> = {
  birdbath: 1.2, // Adjust this to scale birdbath (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  garden_gnome: 1.2, // Adjust this to scale garden gnome (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  pink_flamingo: 1.2, // Adjust this to scale pink flamingo (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  pond: 1.7, // Adjust this to scale pond (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  telescope: 1.9, // Adjust this to scale telescope (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  campfire: 1.0, // Adjust this to scale campfire (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  lawnchair: 1.5, // Adjust this to scale lawn chair (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  // Add more decor types here:
  // fountain: 1.2,
};

// Preview scale factors for each decor type (separate from actual decor scale)
// Use this to adjust preview size during planting mode independently from actual decor size
// This allows you to make the preview appear at a different size while dragging
export const DECOR_PREVIEW_SCALE_FACTORS: Record<string, number> = {
  birdbath: 1.2, // Adjust this to scale birdbath preview (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  garden_gnome: 1.2, // Adjust this to scale garden gnome preview (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  pink_flamingo: 1.2, // Adjust this to scale pink flamingo preview (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  pond: 1.7, // Adjust this to scale pond preview (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  telescope: 1.9, // Adjust this to scale telescope preview (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  campfire: 1.0, // Adjust this to scale campfire preview (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  lawnchair: 1.5, // Adjust this to scale lawn chair preview (1.0 = 100%, 1.5 = 150%, 0.8 = 80%)
  // Add more decor types here:
  // fountain: 1.2,
};

// ============================================
// DECOR POSITION OFFSETS
// ============================================
// Fine-tune the position of each decor type
// These offsets are applied to every instance of that decor type
// 
// offsetX: Horizontal offset in pixels (positive = right, negative = left)
// offsetY: Vertical offset in pixels (positive = up, negative = down)
// 
// Example: If birdbath needs to be lower, set offsetY: -10
// Example: If birdbath needs to shift right, set offsetX: 5

export const DECOR_POSITION_OFFSETS: Record<string, { offsetX: number; offsetY: number }> = {
  birdbath: { offsetX: 0, offsetY: 10 }, // Adjust these to fine-tune birdbath position
  garden_gnome: { offsetX: 0, offsetY: 15 }, // Adjust these to fine-tune garden gnome position
  pink_flamingo: { offsetX: 0, offsetY: 15 }, // Adjust these to fine-tune pink flamingo position
  pond: { offsetX: 0, offsetY: 40 }, // Adjust these to fine-tune pond position
  telescope: { offsetX: 0, offsetY: 40 }, // Adjust these to fine-tune telescope position
  campfire: { offsetX: 0, offsetY: 15 }, // Adjust these to fine-tune campfire position
  lawnchair: { offsetX: 0, offsetY: 25 }, // Adjust these to fine-tune lawn chair position
  // Add more decor types here:
  // fountain: { offsetX: 0, offsetY: -10 },
};

// ============================================
// DECOR PREVIEW POSITION OFFSETS
// ============================================
// Fine-tune the preview position during planting mode
// These offsets ONLY affect the visual preview rendering, NOT the actual placement or collision detection
// 
// offsetX: Horizontal offset in pixels (positive = right, negative = left)
// offsetY: Vertical offset in pixels (positive = up, negative = down)
// 
// Use this to adjust where the preview appears so it "fits" visually during dragging
// Example: If preview needs to appear lower, set offsetY: -10

export const DECOR_PREVIEW_OFFSETS: Record<string, { offsetX: number; offsetY: number }> = {
  birdbath: { offsetX: 0, offsetY: 10 }, // Adjust these to fine-tune birdbath preview position
  garden_gnome: { offsetX: 0, offsetY: 15 }, // Adjust these to fine-tune garden gnome preview position
  pink_flamingo: { offsetX: 0, offsetY: 15 }, // Adjust these to fine-tune pink flamingo preview position
  pond: { offsetX: 0, offsetY: 40 }, // Adjust these to fine-tune pond preview position
  telescope: { offsetX: 0, offsetY: 40 }, // Adjust these to fine-tune telescope preview position
  campfire: { offsetX: 0, offsetY: 15 }, // Adjust these to fine-tune campfire preview position
  lawnchair: { offsetX: 0, offsetY: 25 }, // Adjust these to fine-tune lawn chair preview position
  // Add more decor types here:
  // fountain: { offsetX: 0, offsetY: -10 },
};

// ============================================
// SAPLING SIZE FACTORS
// ============================================
// Scale factors for each sapling category
// Base sapling dimensions are 48x64, these factors multiply those dimensions
// 
// Example: flower: 1.0 = 48x64, flower: 1.5 = 72x96
// Example: largeplant: 1.2 = 57.6x76.8, tree: 1.5 = 72x96

export const SAPLING_SIZE_FACTORS: Record<'flower' | 'largeplant' | 'tree', number> = {
  flower: 1.0
,      // Adjust this to change flower sapling size (1.0 = 100%, 1.5 = 150%, etc.)
  largeplant: 1.3,  // Adjust this to change large plant sapling size
  tree: 1.7,        // Adjust this to change tree sapling size
};

// Base sapling dimensions (before applying category-specific factors)
const SAPLING_BASE_WIDTH = 48;
const SAPLING_BASE_HEIGHT = 64;

/**
 * Get sapling dimensions based on plant category
 */
export function getSaplingDimensions(category: 'flower' | 'largeplant' | 'tree'): { width: number; height: number } {
  const factor = SAPLING_SIZE_FACTORS[category];
  return {
    width: SAPLING_BASE_WIDTH * factor,
    height: SAPLING_BASE_HEIGHT * factor,
  };
}

// ============================================
// SAPLING POSITION OFFSETS
// ============================================
// Fine-tune the position of each sapling category
// These offsets are applied to saplings to adjust their position
// 
// offsetX: Horizontal offset in pixels (positive = right, negative = left)
// offsetY: Vertical offset in pixels (positive = up, negative = down)
// 
// Example: If flower saplings need to be lower, set offsetY: -10
// Example: If tree saplings need to shift right, set offsetX: 5

export const SAPLING_POSITION_OFFSETS: Record<'flower' | 'largeplant' | 'tree', { offsetX: number; offsetY: number }> = {
  flower: { offsetX: 0, offsetY: 15 },      // Adjust these to fine-tune flower sapling position
  largeplant: { offsetX: 0, offsetY: 15 },  // Adjust these to fine-tune large plant sapling position
  tree: { offsetX: 0, offsetY: 15 },        // Adjust these to fine-tune tree sapling position
};

// ============================================
// SAPLING PREVIEW POSITION OFFSETS
// ============================================
// Fine-tune the position of the draggable sapling preview for each category
// These offsets are applied to the preview shown while dragging during planting
// 
// offsetX: Horizontal offset in pixels (positive = right, negative = left)
// offsetY: Vertical offset in pixels (positive = up, negative = down)
// 
// Example: If flower sapling preview needs to be lower, set offsetY: -10
// Example: If tree sapling preview needs to shift right, set offsetX: 5

export const SAPLING_PREVIEW_POSITION_OFFSETS: Record<'flower' | 'largeplant' | 'tree', { offsetX: number; offsetY: number }> = {
  flower: { offsetX: 0, offsetY: 25 },      // Adjust these to fine-tune flower sapling preview position
  largeplant: { offsetX: 0, offsetY: 25 },  // Adjust these to fine-tune large plant sapling preview position
  tree: { offsetX: 0, offsetY: 25 },        // Adjust these to fine-tune tree sapling preview position
};

const FLOWER_BASE_DIMENSIONS: Record<FlowerType, { width: number; height: number }> = {
  rose: { width: 48, height: 64 },
  tulip: { width: 48, height: 64 },
  morning_glory: { width: 48, height: 64 },
  pumpkin: { width: 85, height: 64 },
  apple_tree: { width: 144, height: 192 },
  watermelon: { width: 64, height: 64 },
  orchid: { width: 48, height: 64 },
  strawberry: { width: 48, height: 64 },
};

// ============================================
// FLOWER POSITION OFFSETS
// ============================================
// Fine-tune the position of each flower type relative to its slot
// These offsets are applied to every instance of that flower type
// 
// offsetX: Horizontal offset in pixels (positive = right, negative = left)
// offsetY: Vertical offset in pixels (positive = up, negative = down)
// 
// Example: If apple_tree needs to be lower, set offsetY: -10
// Example: If pumpkin needs to shift right, set offsetX: 5

const FLOWER_POSITION_OFFSETS: Record<FlowerType, { offsetX: number; offsetY: number }> = {
  rose: { offsetX: 0, offsetY: 5 },
  tulip: { offsetX: 0, offsetY: 5 },
  morning_glory: { offsetX: 0, offsetY: 5 },
  pumpkin: { offsetX: 0, offsetY: 5 },
  apple_tree: { offsetX: 0, offsetY: 15 },
  watermelon: { offsetX: 0, offsetY: 5 },
  orchid: { offsetX: 0, offsetY: 5 },
  strawberry: { offsetX: 0, offsetY: 5 },
};

// ============================================
// POSITION OFFSET CONFIGURATION (Dev Tuning)
// ============================================
// Standardized system with category defaults and individual overrides
// Makes it easy to add new flower types and maintain consistency

// Category definitions for grouping similar plants
const FLOWER_CATEGORIES = {
  // Standard flowers (small, similar size)
  flowers: ['rose', 'tulip', 'morning_glory', 'orchid', 'strawberry'] as FlowerTypeId[],
  // Large plants (pumpkin, watermelon - similar positioning needs)
  largePlants: ['pumpkin', 'watermelon'] as FlowerTypeId[],
  // Trees (apple_tree - unique positioning)
  trees: ['apple_tree'] as FlowerTypeId[],
} as const;

// Default offsets by category
const DEFAULT_MATURE_OFFSETS = {
  flowers: { offsetX: 0, offsetY: 0 },
  largePlants: { offsetX: 0, offsetY: 25 },
  trees: { offsetX:0, offsetY: 20 },
} as const;

const DEFAULT_PREVIEW_OFFSETS = {
  flowers: { offsetX: 0, offsetY: 10 },
  largePlants: { offsetX: 0, offsetY: 10 },
  trees: { offsetX: 0, offsetY: 10 },
} as const;

// Individual overrides (only specify when different from category default)
// Leave empty to use category default
const MATURE_PLANT_OVERRIDES: Partial<Record<FlowerTypeId, { offsetX: number; offsetY: number }>> = {
  // Example: apple_tree: { offsetX: 5, offsetY: 10 }, // Override tree default
};

const PREVIEW_OFFSET_OVERRIDES: Partial<Record<FlowerTypeId, { offsetX: number; offsetY: number }>> = {
  // Example: rose: { offsetX: 2, offsetY: 12 }, // Override flower default
};

// Helper function to get category for a flower type
function getFlowerCategory(type: FlowerTypeId): keyof typeof DEFAULT_MATURE_OFFSETS {
  if (FLOWER_CATEGORIES.flowers.includes(type)) return 'flowers';
  if (FLOWER_CATEGORIES.largePlants.includes(type)) return 'largePlants';
  if (FLOWER_CATEGORIES.trees.includes(type)) return 'trees';
  return 'flowers'; // Default fallback
}

// Generate mature plant offsets from defaults and overrides
const MATURE_PLANT_POSITION_OFFSETS: Record<FlowerTypeId, { offsetX: number; offsetY: number }> = 
  Object.fromEntries(
    (['rose', 'tulip', 'morning_glory', 'pumpkin', 'apple_tree', 'watermelon', 'orchid', 'strawberry'] as FlowerTypeId[]).map(type => {
      const category = getFlowerCategory(type);
      const defaultOffset = DEFAULT_MATURE_OFFSETS[category];
      const override = MATURE_PLANT_OVERRIDES[type];
      return [type, override || defaultOffset];
    })
  ) as Record<FlowerTypeId, { offsetX: number; offsetY: number }>;

// Note: SAPLING_PREVIEW_POSITION_OFFSETS is now defined below using category-based system
// This old per-type system is kept for backward compatibility but not used for sapling previews

// Note: Collision radius multipliers are defined in utils/gardenState.ts
// to avoid circular dependencies. Edit COLLISION_RADIUS_OVERRIDES there.

// ============================================
// LANDMARK SIZE CONFIGURATION
// ============================================
// Individual dimensions for each landmark type
// Adjust width and height to resize each landmark independently
// All landmarks anchor at bottom-center, so changing height keeps bottom position fixed

const LANDMARK_DIMENSIONS: Record<LandmarkTypeId, { width: number; height: number }> = {
  mountain: { width: 400, height: 266 }, // 50% of actual asset size (600px -> 300px, 400px -> 200px)
  windmill: { width: 300, height: 300 },
  cooling_tower: { width: 300, height: 300 },
};

/**
 * Get landmark dimensions based on type
 * Returns width and height for the landmark
 */
function getLandmarkDimensions(type: LandmarkTypeId): { width: number; height: number } {
  return LANDMARK_DIMENSIONS[type] || { width: 300, height: 200 };
}

// ============================================
// LANDMARK POSITION OFFSETS
// ============================================
// Fine-tune the position of each landmark type relative to its anchor point
// These offsets are applied to every instance of that landmark type
// 
// offsetX: Horizontal offset in pixels (positive = right, negative = left)
// offsetY: Vertical offset in pixels (positive = down, negative = up)
// 
// Example: If windmill needs to be lower, set offsetY: 10

const LANDMARK_POSITION_OFFSETS: Record<LandmarkTypeId, { offsetX: number; offsetY: number }> = {
  mountain: { offsetX: 0, offsetY: 0 },
  windmill: { offsetX: 0, offsetY: 50 }, // Push windmill down by 20px to align with mountain
  cooling_tower: { offsetX: 0, offsetY: 50 },
};

// ============================================
// PLACEHOLDER COLORS
// ============================================

const PLACEHOLDER_COLORS = {
  fresh: {
    head: '#FF6B81',
    stem: '#228B22',
  },
  wilting: {
    head: '#FFD700',
    stem: '#6B8E23',
  },
  wilted: {
    head: '#8B4513',
    stem: '#8B7355',
  },
};

// ============================================
// FLOWER COMPONENT (Combined Head + Stem)
// ============================================

/**
 * Sapling Image - shown on Day 0 (just planted)
 * Uses dynamic dimensions based on plant category
 */
function SaplingImage({ type, variant, width, height }: { type: FlowerTypeId; variant: FlowerVariant; width: number; height: number }) {
  const asset = getSaplingAsset(type, variant);

  if (hasAsset(asset)) {
    return (
      <Image
        source={asset}
        style={{ width, height }}
        resizeMode="contain"
      />
    );
  }

  // Placeholder for sapling
  return (
    <View style={[styles.saplingPlaceholder, { width, height }]}>
      <Text style={styles.saplingEmoji}>🌱</Text>
      <Text style={styles.placeholderFilename}>sapling_{variant}.png</Text>
    </View>
  );
}

/**
 * Get image dimensions based on flower type
 * Applies individual scale factor to base dimensions for each flower
 */
function getFlowerDimensions(type: FlowerType): { width: number; height: number } {
  const base = FLOWER_BASE_DIMENSIONS[type] || { width: 48, height: 64 };
  const scale = FLOWER_SCALE_FACTORS[type] || 1.0;
  return {
    width: base.width * scale,
    height: base.height * scale,
  };
}

/**
 * Get image dimensions based on decor type
 * Applies individual scale factor to base dimensions for each decor item
 */
function getDecorDimensions(type: string): { width: number; height: number } {
  const base = DECOR_BASE_DIMENSIONS[type] || { width: 64, height: 64 };
  const scale = DECOR_SCALE_FACTORS[type] || 1.0;
  return {
    width: base.width * scale,
    height: base.height * scale,
  };
}

/**
 * Calculate smooth depth scale based on Y position
 * Interpolates smoothly from front (0.9 at Y=0) to back (0.7 at Y=50)
 * This replaces the binary threshold that caused abrupt size changes
 */
function getDepthScale(y: number, maxDepth: number = 50): number {
  // Clamp Y to valid range (0 to maxDepth)
  const clampedY = Math.max(0, Math.min(maxDepth, y));
  
  // Front scale (at Y=0): 0.9
  // Back scale (at Y=maxDepth): 0.7
  // Linear interpolation between these values
  const frontScale = 0.9;
  const backScale = 0.7;
  
  // Calculate interpolation factor (0 at front, 1 at back)
  const t = clampedY / maxDepth;
  
  // Linear interpolation: frontScale + t * (backScale - frontScale)
  return frontScale + t * (backScale - frontScale);
}

/**
 * Find a valid initial position for the sapling
 */
function findValidInitialPosition(
  flowers: PlantedFlower[],
  flowerType: FlowerTypeId,
  decor?: PlantedDecor[]
): { x: number; y: number } {
  const maxDepth = 50;
  // Use sapling dimensions for boundary calculation since we're planting a sapling
  const category = getPlantCategory(flowerType);
  const saplingDims = getSaplingDimensions(category);
  const halfFlowerWidth = saplingDims.width / 2;
  // Allow planting all the way to edges - only constrain to keep center point on screen
  const minCenterX = halfFlowerWidth; // Minimum: half width from left edge
  const maxCenterX = SCREEN_WIDTH - halfFlowerWidth; // Maximum: half width from right edge
  
  // Try center position first
  let x = SCREEN_WIDTH / 2;
  let y = 25; // Middle depth
  
  // Check if center is valid
  if (canPlaceFlower(flowers, flowerType, x, y, decor).valid) {
    return { x, y };
  }
  
  // Try multiple positions in a grid pattern (including edges)
  const attempts = [
    { x: SCREEN_WIDTH * 0.3, y: 15 }, // Left front
    { x: SCREEN_WIDTH * 0.7, y: 15 }, // Right front
    { x: SCREEN_WIDTH * 0.3, y: 35 }, // Left back
    { x: SCREEN_WIDTH * 0.7, y: 35 }, // Right back
    { x: SCREEN_WIDTH * 0.1, y: 25 }, // Very left (10% from left)
    { x: SCREEN_WIDTH * 0.9, y: 25 }, // Very right (10% from right)
    { x: minCenterX, y: 25 }, // Left edge
    { x: maxCenterX, y: 25 }, // Right edge
  ];
  
  for (const attempt of attempts) {
    const clampedX = Math.max(minCenterX, Math.min(maxCenterX, attempt.x));
    if (canPlaceFlower(flowers, flowerType, clampedX, attempt.y, decor).valid) {
      return { x: clampedX, y: attempt.y };
    }
  }
  
  // Fallback: scan systematically (including edges)
  for (let testY = 5; testY < maxDepth; testY += 10) {
    for (let testX = minCenterX; testX <= maxCenterX; testX += 50) {
      if (canPlaceFlower(flowers, flowerType, testX, testY, decor).valid) {
        return { x: testX, y: testY };
      }
    }
  }
  
  // Last resort: center position (might overlap but better than nothing)
  return { x: SCREEN_WIDTH / 2, y: 25 };
}

/**
 * Collision Zone Component - Shows red no-go areas around existing flowers
 */
function CollisionZone({ 
  flower,
  radius 
}: { 
  flower: PlantedFlower; 
  radius: number;
}) {
  if (flower.x === undefined || flower.y === undefined) return null;
  
  // flower.x is center X, flower.y is bottom offset
  // We need to position the zone centered on the flower
  const zoneDiameter = radius * 2;
  const left = flower.x - radius; // Center minus radius
  const bottom = flower.y - radius; // Bottom offset minus radius to center the zone
  
  return (
    <View
      style={[
        styles.collisionZone,
        {
          left,
          bottom,
          width: zoneDiameter,
          height: zoneDiameter,
          borderRadius: radius,
        } as any,
      ]}
      pointerEvents="none"
    />
  );
}

/**
 * Large Sapling Image for Dragging - Makes sapling more visible
 */
function LargeSaplingImage({ type, variant, scale = 1 }: { type: FlowerTypeId; variant: FlowerVariant; scale?: number }) {
  const asset = getSaplingAsset(type, variant);
  const saplingDims = getSaplingDimensions(getPlantCategory(type));
  const scaledWidth = saplingDims.width * scale;
  const scaledHeight = saplingDims.height * scale;

  if (hasAsset(asset)) {
    return (
      <Image
        source={asset}
        style={{
          width: scaledWidth,
          height: scaledHeight,
        }}
        resizeMode="contain"
      />
    );
  }

  // Placeholder for sapling
  return (
    <View style={{
      width: scaledWidth,
      height: scaledHeight,
      alignItems: 'center',
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(200,255,200,0.5)',
      borderRadius: 8,
      borderWidth: 2,
      borderColor: 'rgba(0,0,0,0.1)',
      borderStyle: 'dashed',
    }}>
      <Text style={{ fontSize: scaledHeight * 0.4 }}>🌱</Text>
    </View>
  );
}

/**
 * Draggable Preview Decor Component - Shows where decor item will be planted
 */
function DraggablePreviewDecor({ 
  decorType, 
  initialX,
  initialY,
  onPositionChange,
  isValidPosition,
  actualFlowerAreaHeight = FLOWER_AREA_HEIGHT,
  isFlipped = false,
}: { 
  decorType: string; 
  initialX: number;
  initialY: number;
  onPositionChange: (x: number, y: number) => void;
  isValidPosition: boolean;
  actualFlowerAreaHeight?: number;
  isFlipped?: boolean;
}) {
  // Decor items always show fresh state in preview
  const decorAsset = getDecorAsset(decorType, 'fresh');
  
  // Get base dimensions (without scale factor) for preview
  // We'll apply preview scale factor separately in the transform
  const baseDimensions = DECOR_BASE_DIMENSIONS[decorType] || { width: 64, height: 64 };
  const BASE_DECOR_WIDTH = baseDimensions.width;
  const BASE_DECOR_HEIGHT = baseDimensions.height;
  
  // Get preview scale factor for this decor type (separate from actual decor scale)
  const previewScaleFactor = DECOR_PREVIEW_SCALE_FACTORS[decorType] || 1.0;
  
  // Calculate scaled dimensions for preview
  const DECOR_WIDTH = BASE_DECOR_WIDTH * previewScaleFactor;
  const DECOR_HEIGHT = BASE_DECOR_HEIGHT * previewScaleFactor;
  
  // Get preview-specific offsets (only affects visual rendering, not collision/placement)
  const previewOffsets = DECOR_PREVIEW_OFFSETS[decorType] || { offsetX: 0, offsetY: 0 };
  
  const currentX = initialX;
  const currentY = initialY;
  
  // Use smooth depth scale that matches actual rendering (0.9 front to 0.7 back)
  // This provides gradual scaling that matches what will be rendered, but smoothly
  const maxDepth = 50;
  const depthScale = getDepthScale(currentY, maxDepth); // Smooth interpolation: 0.9 (front) to 0.7 (back)
  
  // Apply preview scaling: depth scale (dimensions already include preview scale factor)
  const baseScale = depthScale;
  
  const halfDecorWidth = DECOR_WIDTH / 2;
  // Base position (used for hitbox - stays at actual coordinates for accurate dragging)
  const baseLeft = currentX - halfDecorWidth;
  const baseBottom = currentY;
  
  // Visual offset for the decor image within the container (only affects visual rendering)
  const previewOffsetX = previewOffsets.offsetX; // Positive = right, negative = left
  const previewOffsetY = previewOffsets.offsetY; // Positive = up, negative = down
  
  // Larger hitbox for easier dragging
  const HITBOX_SIZE = Math.max(80, DECOR_WIDTH + 20);
  const hitboxOffsetX = HITBOX_SIZE / 2 - halfDecorWidth;
  const hitboxOffsetY = HITBOX_SIZE / 2;
  const zIndex = Math.round((50 - currentY) * 4) + 1000;
  
  return (
    <View
      style={[
        styles.flowerWrapper,
        {
          left: baseLeft - hitboxOffsetX,
          bottom: baseBottom - hitboxOffsetY,
          width: HITBOX_SIZE,
          height: HITBOX_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex,
          pointerEvents: 'none',
        } as any,
      ]}
    >
      <View 
        style={[
          {
            width: DECOR_WIDTH,
            height: DECOR_HEIGHT,
            position: 'absolute',
            bottom: hitboxOffsetY - previewOffsetY, // Apply vertical offset (positive = up, so subtract from bottom)
            left: hitboxOffsetX + previewOffsetX, // Apply horizontal offset (positive = right)
            alignItems: 'center',
            justifyContent: 'flex-end',
            opacity: isValidPosition ? 1 : 0.8,
          }
        ]}
        pointerEvents="none"
      >
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
            transform: [{ scale: baseScale }, { scaleX: isFlipped ? -1 : 1 }],
          }}
        >
          {hasAsset(decorAsset) ? (
            <Image
              source={decorAsset}
              style={{
                width: DECOR_WIDTH,
                height: DECOR_HEIGHT,
              }}
              resizeMode="contain"
            />
          ) : (
            <View style={{
              width: DECOR_WIDTH,
              height: DECOR_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.1)',
              borderStyle: 'dashed',
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.3)',
            }}>
              <Text style={{ fontSize: 24 }}>🎨</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/**
 * Draggable Preview Sapling Component - Shows where flower will be planted
 */
function DraggablePreviewSapling({ 
  flowerType, 
  initialX,
  initialY,
  onPositionChange,
  isValidPosition,
  actualFlowerAreaHeight = FLOWER_AREA_HEIGHT,
  isFlipped = false,
}: { 
  flowerType: FlowerTypeId; 
  initialX: number;
  initialY: number;
  onPositionChange: (x: number, y: number) => void;
  isValidPosition: boolean;
  actualFlowerAreaHeight?: number;
  isFlipped?: boolean;
}) {
  const flowerDimensions = getFlowerDimensions(flowerType);
  const halfFlowerWidth = flowerDimensions.width / 2;
  
  // Use props directly - they're updated in real-time during dragging
  // No need for internal state that resets position
  const currentX = initialX;
  const currentY = initialY;
  
  // Use the EXACT same scaling logic as the Flower component
  // Sapling dimensions based on plant category
  const saplingDims = getSaplingDimensions(getPlantCategory(flowerType));
  const IMAGE_WIDTH = saplingDims.width;
  const IMAGE_HEIGHT = saplingDims.height;
  
  // Use smooth depth scale that matches actual rendering (0.9 front to 0.7 back)
  // This provides gradual scaling that matches what will be rendered, but smoothly
  const maxDepth = 50;
  const zIndex = Math.round((maxDepth - currentY) * 4) + 1000; // Very high z-index for dragging
  
  // Smooth depth scaling for preview (matches actual rendering scales but interpolates smoothly)
  const depthScale = getDepthScale(currentY, maxDepth); // Smooth interpolation: 0.9 (front) to 0.7 (back)
  const growthScale = 0.7; // Sapling growth scale (from getGrowthScale('sapling'))
  const scaleVariation = 1.0; // Use 1.0 for preview (no random variation)
  const typeScale = 1.0;
  const baseScale = depthScale * scaleVariation * growthScale * typeScale;
  
  // CRITICAL: currentX is the center X coordinate (bottom-middle point)
  // Both sapling and mature must anchor to the SAME bottom-middle point
  // The anchor point is ALWAYS the bottom-center of the image, regardless of size
  // For preview, we use sapling dimensions (48px) since we're showing a sapling
  const halfSaplingWidth = IMAGE_WIDTH / 2; // 24px for sapling
  
  // Get visual offset for preview (only affects rendering, not collision/placement)
  // These offsets allow fine-tuning the preview position without affecting collision detection or hitbox
  // Use category-based offsets instead of per-type offsets
  const category = getPlantCategory(flowerType);
  const previewOffsets = SAPLING_PREVIEW_POSITION_OFFSETS[category] || { offsetX: 0, offsetY: 0 };
  
  // Container position (used for hitbox - stays at actual coordinates for accurate dragging)
  const left = currentX - halfSaplingWidth; // Center sapling at currentX
  const bottom = currentY;
  
  // Visual offset for the sapling image within the container (only affects visual rendering)
  const saplingOffsetX = previewOffsets.offsetX; // Positive = right, negative = left
  const saplingOffsetY = previewOffsets.offsetY; // Positive = up, negative = down
  
  // Visual size after scaling (what the user will actually see)
  const visualWidth = IMAGE_WIDTH * baseScale;
  const visualHeight = IMAGE_HEIGHT * baseScale;
  
  // Larger hitbox for easier dragging (invisible wrapper around the actual flower)
  // Hitbox should be centered on the sapling (which is centered at currentX)
  const HITBOX_SIZE = Math.max(80, IMAGE_WIDTH + 20); // At least 80px, or sapling width + padding
  const hitboxOffsetX = HITBOX_SIZE / 2 - halfSaplingWidth; // Center hitbox on sapling
  const hitboxOffsetY = HITBOX_SIZE / 2;
  
  return (
    <View
      style={[
        styles.flowerWrapper,
        {
          left: left - hitboxOffsetX,
          bottom: bottom - hitboxOffsetY,
          width: HITBOX_SIZE,
          height: HITBOX_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex,
          pointerEvents: 'none', // Don't intercept touches - parent handles dragging
        } as any,
      ]}
    >
      {/* Actual sapling - uses EXACT same structure as Flower component */}
      <View 
        style={[
          {
            width: IMAGE_WIDTH,
            height: IMAGE_HEIGHT,
            position: 'absolute',
            bottom: hitboxOffsetY - saplingOffsetY, // Apply vertical offset (positive = up, so subtract from bottom)
            left: hitboxOffsetX + saplingOffsetX, // Apply horizontal offset (positive = right)
            alignItems: 'center',
            justifyContent: 'flex-end',
            opacity: isValidPosition ? 1 : 0.8,
          }
        ]}
        pointerEvents="none"
      >
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
            transform: [{ scale: baseScale }, { scaleX: isFlipped ? -1 : 1 }],
          }}
        >
          <SaplingImage 
            type={flowerType} 
            variant="v1" 
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Flower Image - shown from Day 1 onwards
 */
function FlowerImage({ type, variant, health }: { type: FlowerType; variant: FlowerVariant; health: HealthStatus }) {
  const asset = getFlowerAsset(type, variant, health);
  const placeholderHeadColor = PLACEHOLDER_COLORS[health].head;
  const placeholderStemColor = PLACEHOLDER_COLORS[health].stem;
  const dimensions = getFlowerDimensions(type);

  if (hasAsset(asset)) {
    return (
      <Image
        source={asset}
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
        resizeMode="contain"
      />
    );
  }

  // Placeholder: combined head + stem visual
  return (
    <View style={{
      width: dimensions.width,
      height: dimensions.height,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.1)',
      borderStyle: 'dashed',
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.3)',
    }}>
      {/* Head placeholder */}
      <View style={[styles.placeholderHead, { backgroundColor: placeholderHeadColor }]}>
        <Text style={styles.placeholderText}>{type}</Text>
      </View>
      {/* Stem placeholder */}
      <View style={[styles.placeholderStem, { backgroundColor: placeholderStemColor }]} />
      {/* Filename label */}
      <Text style={styles.placeholderFilename}>{type}_{variant}_{health}.png</Text>
    </View>
  );
}

/**
 * Decor Component - Always shows mature stage (no sapling)
 * Decor items have decay states (fresh, wilting, wilted) but no growth stages
 * Uses same positioning and structure as Flower component
 */
function Decor({ 
  decor, 
  health, 
  depthPosition,
  bottomY,
}: { 
  decor: PlantedDecor; 
  health: HealthStatus;
  depthPosition: 'front' | 'back'; // Kept for backward compatibility, but scale is calculated from bottomY
  bottomY: number; // Y coordinate (bottom value) for smooth depth scaling
}) {
  // Decor items always show as mature (no sapling stage)
  const growthScale = 1.0; // Always full size
  
  // Use smooth depth scaling based on Y position (matches preview scaling)
  // Smoothly interpolates from 0.9 (front/Y=0) to 0.7 (back/Y=50)
  const maxDepth = 50;
  const depthScale = getDepthScale(bottomY, maxDepth);
  const baseScale = depthScale * growthScale;
  
  // Get decor dimensions based on type (configurable per decor type)
  const decorDimensions = getDecorDimensions(decor.type);
  const DECOR_WIDTH = decorDimensions.width;
  const DECOR_HEIGHT = decorDimensions.height;
  
  // Get position offsets for this decor type
  const offsets = DECOR_POSITION_OFFSETS[decor.type] || { offsetX: 0, offsetY: 0 };
  
  // Get decor asset based on type and health status
  const decorAsset = getDecorAsset(decor.type, health);
  
  // Use same anchor container structure as Flower component
  // This ensures proper bottom anchoring
  const anchorContainerStyle = {
    width: DECOR_WIDTH,
    height: DECOR_HEIGHT,
    position: 'relative' as const,
  };
  
  return (
    <View style={anchorContainerStyle}>
      <View
        style={[
          {
            width: DECOR_WIDTH,
            height: DECOR_HEIGHT,
            alignItems: 'center',
            justifyContent: 'flex-end',
            // Apply position offsets (offsetX positive = right, offsetY positive = up)
            marginLeft: offsets.offsetX,
            marginBottom: -offsets.offsetY, // Negative because offsetY positive = up (decreases bottom)
          },
          {
            transform: [{ scale: baseScale }, { scaleX: decor.flipped ? -1 : 1 }],
          },
        ]}
      >
        {hasAsset(decorAsset) ? (
          <Image
            source={decorAsset}
            style={{
              width: DECOR_WIDTH,
              height: DECOR_HEIGHT,
            }}
            resizeMode="contain"
          />
        ) : (
          <View style={{
            width: DECOR_WIDTH,
            height: DECOR_HEIGHT,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.1)',
            borderStyle: 'dashed',
            borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.3)',
          }}>
            <Text style={{ fontSize: 24 }}>🎨</Text>
            <Text style={styles.placeholderFilename}>{decor.type}_{health}.png</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Complete Flower Component with Growth Stages
 * 
 * Growth stages:
 * Growth stages vary by plant type:
 * - Flowers: sapling < 30 minutes, mature >= 30 minutes
 * - Large plants: sapling < 6 hours, mature >= 6 hours
 * - Trees: sapling < 12 hours, mature >= 12 hours
 */
function Flower({ 
  flower, 
  health, 
  slotIndex, 
  depthPosition, 
  bottomY,
  bounceScale,
  devGrowthStage,
  isNewlyPlanted,
}: FlowerProps & { 
  devGrowthStage?: 'sapling' | 'mature';
  isNewlyPlanted?: boolean;
}) {
  // Use dev override if provided, otherwise calculate from timestamp
  const growthStage = devGrowthStage || getGrowthStage(flower.plantedAt, flower.type);
  const growthScale = getGrowthScale(growthStage);
  
  // Use smooth depth scaling based on Y position (matches preview scaling)
  // Smoothly interpolates from 0.9 (front/Y=0) to 0.7 (back/Y=50)
  const maxDepth = 50;
  const depthScale = getDepthScale(bottomY, maxDepth);
  // Slight random variation based on slot
  const scaleVariation = 0.9 + ((slotIndex * 7) % 3) * 0.1;
  
  // Type-based scale: morning glory is 20% bigger
  // Note: apple_tree is already 3x bigger in base dimensions, so no extra scale needed
  const typeScale = flower.type === 'morning_glory' ? 1.2 : 1.0;
  
  const isSapling = growthStage === 'sapling';
  
  // All stages use the same scale calculation
  const baseScale = depthScale * scaleVariation * growthScale * typeScale;
  
  // Get image dimensions based on flower type
  // For saplings, use category-specific dimensions
  const imageDimensions = isSapling 
    ? getSaplingDimensions(getPlantCategory(flower.type))
    : getFlowerDimensions(flower.type);
  const IMAGE_HEIGHT = imageDimensions.height;
  const IMAGE_WIDTH = imageDimensions.width;

  // Pop-in animation for newly planted flowers
  const popScale = useSharedValue(isNewlyPlanted ? 0 : 1);

  React.useEffect(() => {
    if (isNewlyPlanted) {
      // Wait 0.5 seconds before starting animation for better rhythm
      const timer = setTimeout(() => {
        // Simple ease animation: 0 → 1.1 → 1.0
        popScale.value = withSequence(
          withTiming(0, { duration: 0 }), // Start at 0
          withTiming(1.1, { duration: 200, easing: Easing.out(Easing.quad) }), // Scale up to 1.1
          withTiming(1.0, { duration: 150, easing: Easing.in(Easing.quad) }) // Scale down to 1.0
        );
      }, 500); // 0.5 second delay

      return () => clearTimeout(timer);
    }
  }, [isNewlyPlanted]);
  
  // Animated style for bounce effect
  // CRITICAL: The scaling anchor point issue
  // When you scale an element in React Native, it scales from the center by default.
  // The Animated.View has width matching IMAGE_WIDTH (48 for sapling, 144 for mature).
  // When scaled, both scale from their center, but since the widths are different,
  // the visual center position relative to the container's left edge is different.
  // 
  // However, since we position the container's left edge at (flower.x - halfImageWidth),
  // and the container centers the image with alignItems: 'center',
  // the image should be centered at flower.x regardless of container size.
  //
  // The real issue: The Animated.View itself is being scaled, and its center
  // is at IMAGE_WIDTH/2 from the container's left. When scaled, the Animated.View
  // shrinks but its center stays at the same position relative to the container.
  // But the image inside might not be exactly centered in the Animated.View after scaling.
  //
  // Solution: Ensure the image is always centered, and the scaling doesn't affect horizontal position.
  // We only need vertical compensation to keep the bottom anchored.
  const animatedStyle = useAnimatedStyle(() => {
    const bounce = bounceScale?.value || 1.0;
    const pop = popScale.value;
    const finalScale = baseScale * bounce * pop;
    
    // Vertical compensation: keep bottom anchored when scaling
    // When scaled down, the element shrinks from center, moving the bottom up.
    // We translate down to compensate and keep bottom at the same position.
    const bottomCompensation = ((1 - finalScale) * IMAGE_HEIGHT) / 2;
    
    return {
      transform: [
        { scale: finalScale },
        { translateY: bottomCompensation },
        { scaleX: flower.flipped ? -1 : 1 },
      ],
    };
  }, [baseScale, IMAGE_HEIGHT, flower.flipped]);

  // Anchor container size matches base image dimensions
  // This ensures proper bottom anchoring for all flower types
  const anchorContainerStyle = {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    position: 'relative' as const,
  };

  return (
    <View style={anchorContainerStyle}>
      <Animated.View 
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
          },
          animatedStyle,
        ]}
      >
        {isSapling ? (
          <SaplingImage 
            type={flower.type} 
            variant={flower.variant} 
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
          />
        ) : (
          <FlowerImage type={flower.type} variant={flower.variant} health={health} />
        )}
      </Animated.View>
    </View>
  );
}

// ============================================
// GROUND COMPONENTS
// ============================================

function GroundSurface({ health }: { health: HealthStatus }) {
  const asset = getGroundAsset(health);

  const groundColors = {
    fresh: '#7CB342',
    wilting: '#9E9D24',
    wilted: '#8D6E63',
  };

  if (hasAsset(asset)) {
    return (
      <Image
        source={asset}
        style={styles.groundSurfaceImage}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.groundSurfacePlaceholder, { backgroundColor: groundColors[health] }]}>
      <Text style={styles.groundLabel}>ground_surface.png</Text>
    </View>
  );
}

function GroundFront({ health }: { health: HealthStatus }) {
  const asset = getGroundFrontAsset(health);

  const groundColors = {
    fresh: '#5D8A30',
    wilting: '#7A7A1A',
    wilted: '#6D5A4A',
  };

  if (hasAsset(asset)) {
    return (
      <Image
        source={asset}
        style={styles.groundFrontImage}
        resizeMode="cover"
      />
    );
  }

  // Placeholder
  return (
    <View style={[styles.groundFrontPlaceholder, { backgroundColor: groundColors[health] }]}>
      <Text style={styles.groundLabel}>ground_front.png</Text>
    </View>
  );
}

function Landmark({ 
  landmark, 
  onPress,
  onDelete,
  onDragStart,
  zIndex,
  isEditingMode,
  isBeingDragged,
}: { 
  landmark: PlantedLandmark;
  onPress?: () => void;
  onDelete?: () => void;
  onDragStart?: () => void;
  zIndex?: number;
  isEditingMode?: boolean;
  isBeingDragged?: boolean;
}) {
  const asset = getLandmarkAsset(landmark.type);
  
  // Fallback emoji map if asset doesn't exist
  const emojiMap: Record<LandmarkTypeId, string> = {
    mountain: '⛰️',
    windmill: '🌾',
    cooling_tower: '🏭',
  };

  const emoji = emojiMap[landmark.type] || '🏔️';
  
  // Get dimensions from configuration
  const { width: landmarkWidth, height: landmarkHeight } = getLandmarkDimensions(landmark.type);
  
  // Get position offsets for this landmark type
  const offsets = LANDMARK_POSITION_OFFSETS[landmark.type] || { offsetX: 0, offsetY: 0 };
  
  // Track if we're dragging this landmark
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  
  // Pan responder for dragging in edit mode - handles dragging directly
  const panResponder = useMemo(
    () => isEditingMode && onDragStart ? PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Don't start drag if touch is on delete button (top-right corner)
        const { locationX, locationY } = evt.nativeEvent;
        const deleteButtonArea = { right: landmarkWidth - 8, top: 8, size: 28 };
        if (locationX > deleteButtonArea.right - deleteButtonArea.size && 
            locationY < deleteButtonArea.top + deleteButtonArea.size) {
          return false; // Touch is on delete button, don't start drag
        }
        return true;
      },
      onMoveShouldSetPanResponder: () => isDragging,
      onPanResponderGrant: () => {
        // Start dragging immediately when touch begins
        setIsDragging(true);
        dragStartRef.current = { x: landmark.x, y: landmark.y };
        onDragStart();
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!dragStartRef.current) return;
        const { dx } = gestureState;
        // Update position through parent callback
        const newX = dragStartRef.current.x + dx;
        // This will be handled by the global pan responder
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        dragStartRef.current = null;
      },
    }) : null,
    [isEditingMode, onDragStart, landmark.x, landmark.y, landmarkWidth, isDragging]
  );

  return (
    <View
      style={[
        styles.landmarkWrapper,
        {
          left: landmark.x - landmarkWidth / 2 + offsets.offsetX, // Center landmark at x coordinate, apply horizontal offset
          bottom: -offsets.offsetY, // Landmarks sit at the horizon line (bottom of landmarks layer) - apply vertical offset (positive offsetY = down, so subtract from bottom)
          width: landmarkWidth,
          height: landmarkHeight,
          zIndex: zIndex ?? 2, // Use provided z-index or default
          opacity: isBeingDragged ? 0.8 : 1, // Slightly transparent when being dragged
        } as any,
      ]}
      {...(panResponder?.panHandlers || {})}
    >
      {hasAsset(asset) ? (
        <Image
          source={asset}
          style={[
            styles.landmarkImage,
            {
              width: landmarkWidth,
              height: landmarkHeight,
              transform: [{ scaleX: landmark.flipped ? -1 : 1 }],
            },
          ]}
          resizeMode="contain"
        />
      ) : (
        <Text style={[styles.landmarkEmoji, { transform: [{ scaleX: landmark.flipped ? -1 : 1 }] }]}>{emoji}</Text>
      )}
      
      {/* Delete Button - Only shown when in edit mode - Render first so it's on top */}
      {isEditingMode && onDelete && (
        <TouchableOpacity
          style={styles.landmarkDeleteButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={14} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
      
      {/* Tap area for moving to front - only in edit mode, positioned below delete button */}
      {isEditingMode && onPress && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={(e) => {
            // Don't trigger if delete button was pressed
            e.stopPropagation();
            onPress();
          }}
          activeOpacity={1}
        />
      )}
    </View>
  );
}

function Fence() {
  const { visualTheme } = useTheme();
  // Use theme fence if available, otherwise fall back to default
  const asset = visualTheme.fenceImage || getFenceAsset();

  if (hasAsset(asset)) {
    return (
      <Image
        source={asset}
        style={styles.fenceImage}
        resizeMode="cover"
      />
    );
  }

  // Placeholder - show space-themed placeholder for space mode
  const isSpaceTheme = visualTheme.id === 'space_mode';
  return (
    <View style={[
      styles.fencePlaceholder,
      isSpaceTheme && styles.fencePlaceholderSpace
    ]}>
      <Text style={styles.groundLabel}>
        {isSpaceTheme ? 'Space Fence (Coming Soon)' : 'Fence.png'}
      </Text>
    </View>
  );
}

// ============================================
// FLOWER POSITIONING LOGIC
// ============================================

interface FlowerPosition {
  left: number;
  bottom: number;
  zIndex: number;
  flower: PlantedFlower;
  depthPosition: 'front' | 'back';
}

interface DecorPosition {
  left: number;
  bottom: number;
  zIndex: number;
  decor: PlantedDecor;
  depthPosition: 'front' | 'back';
}

/**
 * FIXED flower positions - each slot has a predetermined spot
 * When new flowers are added, existing flowers DON'T move
 * 
 * Layout: 33 slots covering full screen width with varied depth
 * Position 0 = center, slots expand outward left and right
 * All positions are on the Ground surface texture
 */
const TOTAL_SLOTS = 33;
const FLOWER_WIDTH = 48; // 20% smaller than 60px

/**
 * Deterministic pseudo-random function seeded by slot index
 * Returns a value between 0 and 1, consistent for each slot
 */
function seededRandom(seed: number): number {
  // Simple hash function for deterministic randomness
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Generate 33 slots covering full width with randomized positions
const FIXED_FLOWER_SLOTS: Array<{ xOffset: number; bottom: number }> = (() => {
  const slots: Array<{ xOffset: number; bottom: number }> = [];
  const usableWidth = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2);
  const halfFlowerWidth = FLOWER_WIDTH / 2;
  
  // Center slot index (slot 16 for 33 slots: 0-32)
  const centerSlotIndex = Math.floor(TOTAL_SLOTS / 2); // 16
  
  // Calculate base spacing - distribute slots evenly across full width
  const baseSpacing = usableWidth / (TOTAL_SLOTS - 1);
  
  // Positioning center X (screen center minus half flower width)
  const positioningCenterX = SCREEN_WIDTH / 2 - halfFlowerWidth;
  
  // Minimum spacing between flower centers to prevent overlap (flower width = 48px)
  const MIN_FLOWER_SPACING = 52; // Slightly more than flower width for safety
  
  // Generate slots with randomized positions, ensuring no overlaps
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    // Use slot index as seed for deterministic randomness
    const seed = i;
    const rand1 = seededRandom(seed); // For horizontal jitter
    const rand3 = seededRandom(seed + 2000); // For depth variation
    
    // Base x position (evenly spaced)
    const baseXFromLeft = HORIZONTAL_PADDING + (i * baseSpacing) - halfFlowerWidth;
    
    // Calculate constrained horizontal jitter to prevent overlaps
    // Maximum jitter is limited to ensure minimum spacing from neighbors
    let maxJitter = Math.min(
      baseSpacing - MIN_FLOWER_SPACING, // Don't get too close to neighbors
      baseSpacing * 0.3 // Or 30% of spacing, whichever is smaller
    );
    maxJitter = Math.max(0, maxJitter); // Ensure non-negative
    
    // Add constrained horizontal jitter
    const horizontalJitter = (rand1 - 0.5) * (maxJitter * 2); // ±maxJitter
    let xFromLeft = baseXFromLeft + horizontalJitter;
    
    // Ensure minimum spacing from previous flower (if exists)
    if (i > 0) {
      const prevSlot = slots[i - 1];
      // Previous flower's left edge position
      const prevXFromLeft = positioningCenterX + prevSlot.xOffset;
      // Current flower's left edge must be at least MIN_FLOWER_SPACING away from previous flower's left edge
      const minXFromLeft = prevXFromLeft + MIN_FLOWER_SPACING;
      xFromLeft = Math.max(xFromLeft, minXFromLeft);
    }
    
    // Ensure minimum spacing to next flower (if exists) - constrain to not get too close
    if (i < TOTAL_SLOTS - 1) {
      const nextBaseX = HORIZONTAL_PADDING + ((i + 1) * baseSpacing) - halfFlowerWidth;
      // Don't let current flower get closer than MIN_FLOWER_SPACING to where next flower's base position would be
      const maxXFromLeft = nextBaseX - MIN_FLOWER_SPACING;
      xFromLeft = Math.min(xFromLeft, maxXFromLeft);
    }
    
    // Calculate offset from positioning center
    const xOffset = xFromLeft - positioningCenterX;
    
    // Randomized depth: wider range (0-40) with more variation
    // Use random distribution across full range for natural spread
    const depthVariation = rand3 * 40; // 0 to 40
    // Slight bias: edge slots slightly more towards back, but still varied
    const distanceFromCenter = Math.abs(i - centerSlotIndex);
    const edgeBias = (distanceFromCenter / centerSlotIndex) * 5; // Max 5px adjustment
    const bottom = Math.round(Math.max(0, Math.min(40, depthVariation + edgeBias)));
    
    // Round to avoid floating point precision issues
    slots.push({ 
      xOffset: Math.round(xOffset), 
      bottom: Math.max(0, bottom) // Ensure non-negative
    });
  }
  
  return slots;
})();

/**
 * Calculate positions for planted flowers
 * Supports both coordinate-based (new) and slot-based (legacy) positioning
 */
function calculateFlowerPositions(flowers: PlantedFlower[], devGrowthStage?: 'sapling' | 'mature'): FlowerPosition[] {
  const positions: FlowerPosition[] = [];
  
  // Handle empty/undefined flowers array
  if (!flowers || flowers.length === 0) {
    return positions;
  }
  
  // Center X for positioning: screen center minus half flower width
  // This ensures the flower's center (at left + 24px) aligns with screen center
  const centerX = SCREEN_WIDTH / 2 - 24; // Screen center minus half flower width (48/2 = 24)

  for (const flower of flowers) {
    if (!flower) continue; // Skip undefined flowers
    
    let left: number;
    let bottom: number;
    
    // Check if flower has coordinates (new system) or slot (legacy system)
    if (flower.x !== undefined && flower.y !== undefined) {
      // Coordinate-based positioning (new system)
      // CRITICAL: flower.x is the center X coordinate (where bottom-middle point is)
      // flower.y is the bottom Y coordinate (where stem hits ground)
      // Both sapling and mature must anchor to the SAME bottom-middle point
      // The anchor point is ALWAYS the bottom-center of the IMAGE, not the container
      // 
      // IMPORTANT: The container size changes (48px for sapling, 144px for mature apple_tree)
      // but the image's bottom-middle point must stay at (flower.x, flower.y)
      // We position the container so the image's center aligns with flower.x
      
      // Get the actual image dimensions that will be rendered
      // Use dev override if provided, otherwise calculate from timestamp
      const growthStage = devGrowthStage || getGrowthStage(flower.plantedAt, flower.type);
      const isSapling = growthStage === 'sapling';
      const actualImageWidth = isSapling 
        ? getSaplingDimensions(getPlantCategory(flower.type)).width 
        : getFlowerDimensions(flower.type).width;
      const halfImageWidth = actualImageWidth / 2;
      
      // Base position: container so the image's center X aligns with flower.x
      let baseLeft = flower.x - halfImageWidth;
      let baseBottom = flower.y;
      
      // Apply position offsets based on growth stage
      if (isSapling) {
        // Apply sapling position offsets based on plant category
        const category = getPlantCategory(flower.type);
        const saplingOffsets = SAPLING_POSITION_OFFSETS[category] || { offsetX: 0, offsetY: 0 };
        baseLeft += saplingOffsets.offsetX; // Positive = right, negative = left
        baseBottom -= saplingOffsets.offsetY; // Positive offsetY = up (decreases bottom), negative = down (increases bottom)
      } else {
        // Apply mature plant position offsets for mature plants
        // These offsets allow fine-tuning mature plant positions without affecting collision zones
        // flower.type is FlowerTypeId, which matches FlowerType values
        const matureOffsets = MATURE_PLANT_POSITION_OFFSETS[flower.type as FlowerType] || { offsetX: 0, offsetY: 0 };
        baseLeft += matureOffsets.offsetX; // Positive = right, negative = left
        baseBottom -= matureOffsets.offsetY; // Positive offsetY = up (decreases bottom), negative = down (increases bottom)
      }
      
      left = baseLeft;
      bottom = baseBottom;
    } else if (flower.slot !== undefined && flower.slot < FIXED_FLOWER_SLOTS.length) {
      // Slot-based positioning (legacy system for backward compatibility)
      const slotIndex = flower.slot;
      const slot = FIXED_FLOWER_SLOTS[slotIndex];
      
      // Get position offsets for this flower type
      const offsets = FLOWER_POSITION_OFFSETS[flower.type] || { offsetX: 0, offsetY: 0 };
      
      // Fixed horizontal position from center (rounded to integer for React Native)
      // Apply flower-type-specific X offset
      left = Math.round(centerX + slot.xOffset + offsets.offsetX);
      
      // Fixed vertical position (bottom value, rounded to integer)
      // Apply flower-type-specific Y offset (offsetY positive = up, so subtract from bottom)
      bottom = Math.round(slot.bottom - offsets.offsetY);
    } else {
      // Invalid flower data, skip
      continue;
    }
    
    // Depth position for scaling (lower bottom = front)
    // Updated threshold to 25 (half of new 0-50 range for more depth)
    const depthPosition: 'front' | 'back' = bottom < 25 ? 'front' : 'back';

    // Z-index: LOWER bottom = FRONT = HIGHER z-index (renders on top)
    // Use wider range (0-50) with multiplication to ensure proper separation
    // This guarantees flowers with lower bottom values always render in front
    const maxDepth = 50; // Increased from 40 for more depth
    const zIndex = Math.round((maxDepth - bottom) * 4); // Range: 0 (back) to 200 (front)

    positions.push({
      left,
      bottom,
      zIndex,
      flower,
      depthPosition,
    });
  }

  return positions;
}

/**
 * Calculate positions for planted decor items
 * Decor items use coordinate-based positioning (same as flowers)
 */
function calculateDecorPositions(decor: PlantedDecor[]): DecorPosition[] {
  const positions: DecorPosition[] = [];
  
  // Handle empty/undefined decor array
  if (!decor || decor.length === 0) {
    return positions;
  }
  
  for (const decorItem of decor) {
    if (!decorItem || decorItem.x === undefined || decorItem.y === undefined) {
      continue; // Skip invalid decor items
    }
    
    // Get decor dimensions based on type (configurable per decor type)
    const decorDimensions = getDecorDimensions(decorItem.type);
    const DECOR_WIDTH = decorDimensions.width;
    const halfDecorWidth = DECOR_WIDTH / 2;
    
    // Get position offsets for this decor type
    const offsets = DECOR_POSITION_OFFSETS[decorItem.type] || { offsetX: 0, offsetY: 0 };
    
    // Base position: container so the image's center X aligns with decorItem.x
    let baseLeft = decorItem.x - halfDecorWidth;
    let baseBottom = decorItem.y;
    
    // Apply position offsets (offsetX positive = right, offsetY positive = up)
    baseLeft += offsets.offsetX;
    baseBottom -= offsets.offsetY; // Negative because offsetY positive = up (decreases bottom)
    
    const left = baseLeft;
    const bottom = baseBottom;
    
    // Depth position for scaling (lower bottom = front)
    const depthPosition: 'front' | 'back' = bottom < 25 ? 'front' : 'back';
    
    // Z-index: LOWER bottom = FRONT = HIGHER z-index (renders on top)
    const maxDepth = 50;
    const zIndex = Math.round((maxDepth - bottom) * 4); // Range: 0 (back) to 200 (front)
    
    positions.push({
      left,
      bottom,
      zIndex,
      decor: decorItem,
      depthPosition,
    });
  }
  
  return positions;
}

// ============================================
// WATERING CAN BUTTON
// ============================================

function WateringCanButton({
  water,
  onPress,
  onBlocked,
  colors,
  canWater = true,
}: {
  water: number;
  onPress: () => void;
  onBlocked?: () => void;
  colors: typeof Colors.light;
  canWater?: boolean;
}) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value },
      ],
    };
  });

  const handlePress = useCallback(() => {
    console.log('[WateringCanButton] handlePress called, water:', water, 'canWater:', canWater);
    
    // If disabled (no water or cooldown), trigger blocked callback
    if (water <= 0 || !canWater) {
      console.log('[WateringCanButton] Button is disabled, calling onBlocked');
      if (onBlocked) {
        onBlocked();
      } else {
        console.log('[WateringCanButton] onBlocked callback is not provided');
      }
      return;
    }

    // Trigger haptics
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate watering can: rotate and scale
    rotation.value = withSequence(
      withTiming(45, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 200, easing: Easing.inOut(Easing.quad) })
    );
    scale.value = withSequence(
      withTiming(1.2, { duration: 150, easing: Easing.out(Easing.quad) }),
      withSpring(1.0, { damping: 8, stiffness: 200 })
    );

    // Call the onPress handler
    onPress();
  }, [onPress, onBlocked, rotation, scale, water, canWater]);

  const isDisabled = water <= 0 || !canWater;
  // Inverted colors: white icon when enabled, gray when disabled
  const iconColor = isDisabled ? '#999' : '#FFFFFF';

  // Debug log
  useEffect(() => {
    console.log('[WateringCanButton] canWater:', canWater, 'water:', water, 'isDisabled:', isDisabled);
  }, [canWater, water, isDisabled]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={isDisabled ? 0.5 : 0.7}
      style={[styles.wateringCanButton, isDisabled && { opacity: 0.5 }]}
    >
      <Animated.View style={animatedStyle}>
        <Droplets size={28} color={iconColor} strokeWidth={2} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// REVIVAL BUTTON (shown when garden is wilted)
// ============================================

function RevivalButton({
  onPress,
  colors,
}: {
  onPress: () => void;
  colors: typeof Colors.light;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePress = useCallback(() => {
    // Trigger haptics
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Animate button: scale
    scale.value = withSequence(
      withTiming(1.2, { duration: 150, easing: Easing.out(Easing.quad) }),
      withSpring(1.0, { damping: 8, stiffness: 200 })
    );

    // Call the onPress handler
    onPress();
  }, [onPress, scale]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[styles.revivalButton, { backgroundColor: colors.error }]}
    >
      <Animated.View style={animatedStyle}>
        <AlertCircle size={28} color="#FFFFFF" strokeWidth={2} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ============================================
// MAIN GARDEN COMPONENT
// ============================================

export function Garden({ 
  flowers, 
  decor = [],
  flowerCount, 
  health, 
  streakProgress, 
  landmarks = [],
  water = 0, 
  onWater,
  onWaterBlocked,
  harmonyState = 'normal',
  canWater = true,
  onRevive,
  devGrowthStage,
  devHealth: devHealthOverride,
  onDevGrowthStageChange,
  onDevHealthChange,
  newlyPlantedFlowerId,
  onDevRemoveLastFlower,
  onDevAddRose,
  onDevRemoveAllFlowers,
  onDevAddCoins,
  onDevRemoveAllLandmarks,
  onDevResetQuestion,
  onDevShowPremiumModal,
  isPlantingMode = false,
  pendingItem = null,
  onPlaceConfirm,
  onPlaceCancel,
  isEditingLandmarks = false,
  onEditLandmarksDone,
  onLandmarkUpdate,
  onLandmarkDelete,
  onLandmarkMoveToFront,
  onLandmarkMoveToBack,
}: GardenProps) {
  const { visualTheme } = useTheme();
  const flowerPositions = calculateFlowerPositions(flowers, devGrowthStage);
  const decorPositions = calculateDecorPositions(decor);
  const plantBounceScale = useSharedValue(1.0);
  const [showDevTools, setShowDevTools] = useState(false);
  const [splashActive, setSplashActive] = useState(false);
  const [showCollisionZones, setShowCollisionZones] = useState(false);
  
  // Planting mode state
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [isValidPosition, setIsValidPosition] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Automatically find valid initial position when entering planting mode
  useEffect(() => {
    if (isPlantingMode && pendingItem && !pendingPosition) {
      if (pendingItem.category === 'landmark') {
        // For landmarks: Y is locked at horizon, X is over last landmark or center
        const lastLandmark = landmarks.length > 0 ? landmarks[landmarks.length - 1] : null;
        const initialX = lastLandmark ? lastLandmark.x : SCREEN_WIDTH / 2;
        const initialY = HORIZON_Y; // Locked at horizon line
        setPendingPosition({ x: initialX, y: initialY });
        setIsValidPosition(true); // No collision check for landmarks
        setPlacementError(null);
        console.log('[Garden] 🏔️ Auto-placed landmark at horizon:', { x: initialX, y: initialY });
      } else {
        // For flowers: use existing logic
        const validPos = findValidInitialPosition(flowers, pendingItem.type as FlowerTypeId, decor);
        setPendingPosition(validPos);
        const validation = canPlaceFlower(flowers, pendingItem.type as FlowerTypeId, validPos.x, validPos.y, decor);
        setIsValidPosition(validation.valid);
        setPlacementError(null);
        console.log('[Garden] 🌱 Auto-placed sapling at valid position:', validPos);
      }
    }
  }, [isPlantingMode, pendingItem, flowers, landmarks]);
  
  // Memoize splash positions to prevent unnecessary recalculations
  const splashPositions = useMemo(() => {
    return flowerPositions.map((pos) => {
      // Get actual flower dimensions for this flower type
      const dimensions = getFlowerDimensions(pos.flower.type);
      const flowerWidth = dimensions.width;
      const flowerHeight = dimensions.height;
      
      // Calculate Y position: flowers are positioned from bottom of flowers layer
      // Flowers layer: top=0, bottom=GROUND_FRONT_HEIGHT - 10 = 40px from bottom of stage
      // Flower bottom is measured from bottom of flowers layer (40px from stage bottom)
      // Flower center Y = (FLOWER_AREA_HEIGHT - pos.bottom - halfHeight) from top of flowers layer
      // Move splash down a bit (add 15px) so it appears closer to the ground surface
      const flowerCenterY = FLOWER_AREA_HEIGHT - pos.bottom - (flowerHeight / 2) + 15;
      
      return {
        x: pos.left + (flowerWidth / 2), // Center of flower (half of actual width)
        y: flowerCenterY,
      };
    });
  }, [flowerPositions]);
  
  // Use dev overrides if provided, otherwise use normal health
  const effectiveHealth: FlowerHealth = devHealthOverride || health;

  // Trigger plant bounce when watering
  const triggerBounce = useCallback(() => {
    plantBounceScale.value = withSequence(
      withTiming(1.1, { duration: 200, easing: Easing.out(Easing.quad) }),
      withSpring(1.0, { damping: 8, stiffness: 200 })
    );
  }, [plantBounceScale]);

  const handleWater = useCallback(() => {
    // Don't do anything if user can't water (6-hour cooldown)
    if (!canWater) {
      console.log('[Garden] handleWater blocked - canWater is false');
      return;
    }
    
    console.log('[Garden] handleWater proceeding - canWater is true');
    
    // Trigger splash animation immediately
    setSplashActive(true);
    
    // Trigger plant bounce with 0.2 second delay (splash should appear first)
    setTimeout(() => {
      triggerBounce();
    }, 200);
    
    // Call the watering logic
    onWater?.();
  }, [onWater, triggerBounce, canWater]);

  const handleSplashComplete = useCallback(() => {
    setSplashActive(false);
  }, []);

  // Planting mode handlers
  const flowersLayerRef = useRef<View>(null);
  const [actualFlowerAreaHeight, setActualFlowerAreaHeight] = useState(FLOWER_AREA_HEIGHT);
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Use refs for values that change frequently to avoid recreating PanResponder
  const isPlantingModeRef = useRef(isPlantingMode);
  const pendingPositionRef = useRef(pendingPosition);
  const pendingItemRef = useRef(pendingItem);
  const flowersRef = useRef(flowers);
  const decorRef = useRef(decor);
  
  // Update refs when values change
  useEffect(() => {
    isPlantingModeRef.current = isPlantingMode;
  }, [isPlantingMode]);
  
  useEffect(() => {
    pendingPositionRef.current = pendingPosition;
  }, [pendingPosition]);
  
  useEffect(() => {
    pendingItemRef.current = pendingItem;
  }, [pendingItem]);
  
  useEffect(() => {
    flowersRef.current = flowers;
    decorRef.current = decor;
  }, [flowers, decor]);
  
  // Measure actual flowersLayer height when it's laid out
  const handleFlowersLayerLayout = useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    console.log('[Garden] Measured flowersLayer height:', height, 'vs FLOWER_AREA_HEIGHT constant:', FLOWER_AREA_HEIGHT);
    // The actual visual plantable area might be different from the constant
    // Use the measured height for accurate coordinate conversion
    setActualFlowerAreaHeight(height);
  }, []);
  
  // Handle position change during dragging
  const handlePositionChange = useCallback((x: number, y: number) => {
    const currentPendingItem = pendingItemRef.current;
    if (!currentPendingItem) return;
    
    setPendingPosition({ x, y });
    
    // Check for collisions (x and y are center X and bottom Y)
    // Only update isValidPosition for visual feedback (opacity), but don't show error message during dragging
    // Skip collision check for landmarks
    if (currentPendingItem.category !== 'landmark') {
      // For flowers, check against both flowers and decor
      if (currentPendingItem.category === 'flower') {
        const validation = canPlaceFlower(flowers, currentPendingItem.type as FlowerTypeId, x, y, decor);
        setIsValidPosition(validation.valid);
      } else if (currentPendingItem.category === 'decor') {
        // For decor, check against both flowers and decor
        const validation = canPlaceDecor(flowers, decor, currentPendingItem.type, x, y);
        setIsValidPosition(validation.valid);
      } else {
        setIsValidPosition(true);
      }
    } else {
      setIsValidPosition(true); // No collision check for landmarks
    }
    // Don't set placementError during dragging - only show error when user tries to confirm
  }, [flowers]);
  
  // Pan responder for dragging anywhere on the screen
  // Use useMemo with stable dependencies - read from refs inside callbacks
  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => {
        const shouldCapture = isPlantingModeRef.current && pendingPositionRef.current !== null;
        console.log('[Garden] onStartShouldSetPanResponder:', shouldCapture, { isPlantingMode: isPlantingModeRef.current, hasPendingPosition: pendingPositionRef.current !== null });
        return shouldCapture;
      },
      onMoveShouldSetPanResponder: () => {
        const shouldCapture = isPlantingModeRef.current && pendingPositionRef.current !== null;
        return shouldCapture;
      },
      onPanResponderGrant: (evt) => {
        console.log('[Garden] onPanResponderGrant');
        const currentPendingPosition = pendingPositionRef.current;
        if (!currentPendingPosition) return;
        dragStartPositionRef.current = { x: currentPendingPosition.x, y: currentPendingPosition.y };
        setIsDragging(true);
        // Clear error message when starting to drag
        setPlacementError(null);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!dragStartPositionRef.current) return;
        const currentPendingItem = pendingItemRef.current;
        if (!currentPendingItem) return;
        
        const { dx, dy } = gestureState;
        // For landmarks, use configured width; for flowers, use sapling dimensions (since we're planting a sapling)
        let halfFlowerWidth: number;
        if (currentPendingItem.category === 'landmark') {
          halfFlowerWidth = getLandmarkDimensions(currentPendingItem.type as LandmarkTypeId).width / 2;
        } else if (currentPendingItem.category === 'flower') {
          // Use sapling dimensions for boundary calculation since we're planting a sapling
          const flowerType = currentPendingItem.type as FlowerTypeId;
          const category = getPlantCategory(flowerType);
          const saplingDims = getSaplingDimensions(category);
          halfFlowerWidth = saplingDims.width / 2;
        } else {
          // For decor, use decor dimensions
          halfFlowerWidth = getFlowerDimensions(currentPendingItem.type as FlowerTypeId).width / 2;
        }
        
        // Calculate new position relative to drag start
        // For landmarks: allow moving outside screen edges (no constraints)
        // For flowers: constrain to keep center point on screen
        let newX: number;
        if (currentPendingItem.category === 'landmark') {
          // Landmarks can be moved anywhere, even outside screen
          newX = dragStartPositionRef.current.x + dx;
        } else {
          // Flowers: constrain to screen edges using sapling dimensions
          newX = Math.max(
            halfFlowerWidth, // Allow planting near left edge
            Math.min(SCREEN_WIDTH - halfFlowerWidth, dragStartPositionRef.current.x + dx) // Allow planting near right edge
          );
        }
        
        // Handle Y position based on item type
        let newY: number;
        if (currentPendingItem.category === 'landmark') {
          // Landmarks: Y-axis is locked at horizon line
          newY = HORIZON_Y;
        } else {
          // Flowers: Allow vertical dragging
          // Convert vertical movement to bottom offset
          // dy is positive when moving down (finger moves down screen)
          // We need to convert this to bottom offset: positive dy = lower bottom = front
          const maxDepth = 50;
          const scaleFactor = maxDepth / actualFlowerAreaHeight;
          newY = Math.max(0, Math.min(maxDepth, dragStartPositionRef.current.y - dy * scaleFactor));
        }
        
        handlePositionChange(newX, newY);
      },
      onPanResponderRelease: () => {
        console.log('[Garden] onPanResponderRelease');
        const currentPendingPosition = pendingPositionRef.current;
        const currentPendingItem = pendingItemRef.current;
        const currentFlowers = flowersRef.current;
        const currentDecor = decorRef.current;
        
        // Validate position when user releases finger
        if (currentPendingPosition && currentPendingItem) {
          if (currentPendingItem.category === 'landmark') {
            // No validation for landmarks
            setIsValidPosition(true);
            setPlacementError(null);
          } else {
            let errorMessage: string | null = null;
            let isValid = true;
            
            // For flowers, check against both flowers and decor
            if (currentPendingItem.category === 'flower') {
              const validation = canPlaceFlower(currentFlowers, currentPendingItem.type as FlowerTypeId, currentPendingPosition.x, currentPendingPosition.y, currentDecor);
              isValid = validation.valid;
              errorMessage = validation.valid ? null : 'Too close to existing object';
            } else if (currentPendingItem.category === 'decor') {
              // For decor, check against both flowers and decor
              const validation = canPlaceDecor(currentFlowers, currentDecor, currentPendingItem.type, currentPendingPosition.x, currentPendingPosition.y);
              isValid = validation.valid;
              errorMessage = validation.valid ? null : 'Too close to existing object';
            } else {
              isValid = true;
              errorMessage = null;
            }
            
            setIsValidPosition(isValid);
            setPlacementError(errorMessage);
            console.log('[Garden] Validation on release:', { valid: isValid, error: errorMessage });
          }
        }
        
        dragStartPositionRef.current = null;
        setIsDragging(false);
      },
    }),
    [actualFlowerAreaHeight, handlePositionChange] // Only recreate when these change
  );

  const handleConfirmPlacement = useCallback(async () => {
    if (!pendingPosition || !pendingItem || !onPlaceConfirm) return;
    
    // Validate position one more time before confirming (skip for landmarks)
    if (pendingItem.category !== 'landmark') {
      // For flowers, check against both flowers and decor
      if (pendingItem.category === 'flower') {
        const validation = canPlaceFlower(flowers, pendingItem.type as FlowerTypeId, pendingPosition.x, pendingPosition.y, decor);
        if (!validation.valid) {
          setPlacementError('Too close to existing object');
          console.log('[Garden] ❌ Cannot confirm - invalid position:', validation.reason);
          return;
        }
      } else if (pendingItem.category === 'decor') {
        // For decor, check against both flowers and decor
        const validation = canPlaceDecor(flowers, decor, pendingItem.type, pendingPosition.x, pendingPosition.y);
        if (!validation.valid) {
          setPlacementError('Too close to existing object');
          console.log('[Garden] ❌ Cannot confirm - invalid position:', validation.reason);
          return;
        }
      }
    }
    
    console.log('[Garden] ✅ Confirming placement at:', pendingPosition, 'flipped:', isFlipped);
    await onPlaceConfirm(pendingPosition.x, pendingPosition.y, isFlipped);
    
    // Reset state
    setPendingPosition(null);
    setPlacementError(null);
    setIsFlipped(false);
  }, [pendingPosition, pendingItem, onPlaceConfirm, flowers, isFlipped]);

  const handleCancelPlacement = useCallback(() => {
    console.log('[Garden] ❌ Canceling placement');
    setPendingPosition(null);
    setPlacementError(null);
    onPlaceCancel?.();
  }, [onPlaceCancel]);

  // Reset placement state when exiting planting mode
  useEffect(() => {
    if (!isPlantingMode) {
      setPendingPosition(null);
      setPlacementError(null);
      setIsValidPosition(true);
      setIsFlipped(false);
    }
  }, [isPlantingMode]);

  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);
  
  // Landmark editing - track which landmark is being dragged
  const [draggingLandmarkId, setDraggingLandmarkId] = useState<string | null>(null);
  const [draggingLandmarkPosition, setDraggingLandmarkPosition] = useState<{ x: number; y: number } | null>(null);
  const draggingLandmarkStartRef = useRef<{ x: number; y: number } | null>(null);
  
  // Handle landmark press - move to front
  const handleLandmarkPress = useCallback(async (landmarkId: string) => {
    if (!isEditingLandmarks || !onLandmarkMoveToFront) return;
    await onLandmarkMoveToFront(landmarkId);
  }, [isEditingLandmarks, onLandmarkMoveToFront]);
  
  // Handle landmark delete
  const handleLandmarkDelete = useCallback(async (landmarkId: string) => {
    if (!isEditingLandmarks || !onLandmarkDelete) return;
    await onLandmarkDelete(landmarkId);
  }, [isEditingLandmarks, onLandmarkDelete]);
  
  // Handle landmark drag start
  const handleLandmarkDragStart = useCallback((landmarkId: string) => {
    if (!isEditingLandmarks) return;
    const landmark = landmarks.find(l => l.id === landmarkId);
    if (landmark) {
      setDraggingLandmarkId(landmarkId);
      setDraggingLandmarkPosition({ x: landmark.x, y: landmark.y });
      draggingLandmarkStartRef.current = { x: landmark.x, y: landmark.y };
    }
  }, [isEditingLandmarks, landmarks]);
  
  // Global pan responder for dragging landmarks in edit mode - always active when in edit mode
  const landmarkDragPanResponder = useMemo(
    () => isEditingLandmarks ? PanResponder.create({
      onStartShouldSetPanResponder: () => draggingLandmarkId !== null,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture if we're dragging and there's movement
        return draggingLandmarkId !== null && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2);
      },
      onPanResponderGrant: () => {
        // Ensure we have the start position
        if (draggingLandmarkId && draggingLandmarkStartRef.current === null) {
          const landmark = landmarks.find(l => l.id === draggingLandmarkId);
          if (landmark) {
            draggingLandmarkStartRef.current = { x: landmark.x, y: landmark.y };
          }
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!draggingLandmarkStartRef.current || !draggingLandmarkId) return;
        const { dx } = gestureState;
        // Landmarks can be moved anywhere, even outside screen
        const newX = draggingLandmarkStartRef.current.x + dx;
        // Y is locked at horizon line
        const newY = HORIZON_Y;
        setDraggingLandmarkPosition({ x: newX, y: newY });
      },
      onPanResponderRelease: async () => {
        if (draggingLandmarkId && draggingLandmarkPosition && onLandmarkUpdate) {
          await onLandmarkUpdate(draggingLandmarkId, draggingLandmarkPosition.x, draggingLandmarkPosition.y);
        }
        draggingLandmarkStartRef.current = null;
        setDraggingLandmarkId(null);
        setDraggingLandmarkPosition(null);
      },
    }) : null,
    [isEditingLandmarks, draggingLandmarkId, draggingLandmarkPosition, onLandmarkUpdate, landmarks]
  );

  return (
    <View style={styles.container}>
      {/* Stage Container (2.5D Perspective) */}
      <View style={styles.stageContainer}>
        {/* Flowers Layer (Absolute, over the ground surface) */}
        <View 
          ref={flowersLayerRef}
          style={styles.flowersLayer}
          onLayout={handleFlowersLayerLayout}
        >
          {/* Collision Zones - Show red no-go areas around existing flowers and decor in planting mode or when dev toggle is on */}
          {(isPlantingMode || showCollisionZones) && (
            <>
              {flowerPositions.map((pos) => {
                if (pos.flower.x === undefined || pos.flower.y === undefined) return null;
                
                // Use the EXACT same function as collision detection to ensure perfect match
                const baseReducedRadius = getReducedCollisionRadius(pos.flower.type);
                // Apply collision radius multiplier for fine-tuning
                const multiplier = COLLISION_RADIUS_MULTIPLIERS[pos.flower.type] || 1.0;
                const adjustedRadius = baseReducedRadius * multiplier;
                
                return (
                  <CollisionZone
                    key={`collision-${pos.flower.id}`}
                    flower={pos.flower}
                    radius={adjustedRadius}
                  />
                );
              })}
              {decorPositions.map((pos) => {
                if (pos.decor.x === undefined || pos.decor.y === undefined) return null;
                
                // Get collision radius for this decor type (configurable per decor type)
                const decorRadius = getDecorCollisionRadius(pos.decor.type);
                
                return (
                  <View
                    key={`collision-decor-${pos.decor.id}`}
                    style={[
                      styles.collisionZone,
                      {
                        left: pos.decor.x - decorRadius,
                        bottom: pos.decor.y - decorRadius,
                        width: decorRadius * 2,
                        height: decorRadius * 2,
                        borderRadius: decorRadius,
                      } as any,
                    ]}
                    pointerEvents="none"
                  />
                );
              })}
            </>
          )}
          
          {flowerPositions.map((pos) => (
            <View
              key={pos.flower.id}
              style={[
                styles.flowerWrapper,
                {
                  left: pos.left,
                  bottom: pos.bottom,
                  zIndex: pos.zIndex,
                } as any,
              ]}
            >
              <Flower
                flower={pos.flower}
                health={effectiveHealth}
                slotIndex={pos.flower.slot ?? 0}
                depthPosition={pos.depthPosition}
                bottomY={pos.bottom}
                bounceScale={plantBounceScale}
                devGrowthStage={devGrowthStage}
                isNewlyPlanted={newlyPlantedFlowerId === pos.flower.id}
              />
            </View>
          ))}
          
          {/* Decor Items - Rendered alongside flowers */}
          {decorPositions.map((pos) => (
            <View
              key={pos.decor.id}
              style={[
                styles.flowerWrapper,
                {
                  left: pos.left,
                  bottom: pos.bottom,
                  zIndex: pos.zIndex,
                } as any,
              ]}
            >
              <Decor
                decor={pos.decor}
                health={effectiveHealth}
                depthPosition={pos.depthPosition}
                bottomY={pos.bottom}
              />
            </View>
          ))}
          
          {/* Draggable Preview - Shows where the item will be planted */}
          {isPlantingMode && pendingItem && pendingPosition && (
            pendingItem.category === 'landmark' ? null : ( // Landmark preview moved to landmarksLayer
              pendingItem.category === 'decor' ? (
                // Decor preview
                <DraggablePreviewDecor
                  decorType={pendingItem.type}
                  initialX={pendingPosition.x}
                  initialY={pendingPosition.y}
                  onPositionChange={handlePositionChange}
                  isValidPosition={isValidPosition}
                  actualFlowerAreaHeight={actualFlowerAreaHeight}
                  isFlipped={isFlipped}
                />
              ) : (
                // Flower preview
                <DraggablePreviewSapling
                  flowerType={pendingItem.type as FlowerTypeId}
                  initialX={pendingPosition.x}
                  initialY={pendingPosition.y}
                  onPositionChange={handlePositionChange}
                  isValidPosition={isValidPosition}
                  actualFlowerAreaHeight={actualFlowerAreaHeight}
                  isFlipped={isFlipped}
                />
              )
            )
          )}
        </View>

        {/* Landmarks Layer (Behind fence, at horizon line) - Rendered before fence to ensure proper layering */}
        <View style={styles.landmarksLayer}>
          {/* Existing Landmarks */}
          {landmarks.length > 0 && landmarks
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) // Sort by order (lower = back, higher = front)
              .map((landmark, index) => {
                // Skip rendering if this landmark is being dragged (we'll render it separately)
                if (draggingLandmarkId === landmark.id) return null;
                
                // Calculate z-index: base 2 + order offset (each order increment = +1 z-index, but keep within landmarks layer)
                // Use order value directly, but ensure it stays in the landmarks layer range (2-4, below fence at 5)
                const baseZIndex = 2;
                const orderOffset = landmark.order ?? index;
                // Keep z-index between 2 and 4 (below fence at 5)
                const landmarkZIndex = Math.min(4, baseZIndex + orderOffset);
                
                return (
                  <Landmark
                    key={landmark.id}
                    landmark={landmark}
                    onPress={() => handleLandmarkPress(landmark.id)}
                    onDelete={() => handleLandmarkDelete(landmark.id)}
                    onDragStart={() => handleLandmarkDragStart(landmark.id)}
                    zIndex={landmarkZIndex}
                    isEditingMode={isEditingLandmarks}
                    isBeingDragged={false}
                  />
                );
              })}
          
          {/* Render dragging landmark at new position */}
          {draggingLandmarkId && draggingLandmarkPosition && (() => {
            const draggingLandmark = landmarks.find(l => l.id === draggingLandmarkId);
            if (!draggingLandmark) return null;
            
            const asset = getLandmarkAsset(draggingLandmark.type);
            const emojiMap: Record<LandmarkTypeId, string> = {
              mountain: '⛰️',
              windmill: '🌾',
              cooling_tower: '🏭',
            };
            const emoji = emojiMap[draggingLandmark.type] || '🏔️';
            const { width: landmarkWidth, height: landmarkHeight } = getLandmarkDimensions(draggingLandmark.type);
            const offsets = LANDMARK_POSITION_OFFSETS[draggingLandmark.type] || { offsetX: 0, offsetY: 0 };
            
            return (
              <View
                style={[
                  styles.landmarkWrapper,
                  {
                    left: draggingLandmarkPosition.x - landmarkWidth / 2 + offsets.offsetX, // Center landmark, apply horizontal offset
                    bottom: -offsets.offsetY, // Apply vertical offset (positive offsetY = down, so subtract from bottom)
                    width: landmarkWidth,
                    height: landmarkHeight,
                    zIndex: 4, // Above other landmarks when dragging
                    opacity: 0.8, // Slightly transparent to show it's being dragged
                  } as any,
                ]}
              >
                {hasAsset(asset) ? (
                  <Image
                    source={asset}
                    style={[
                      styles.landmarkImage,
                      {
                        width: landmarkWidth,
                        height: landmarkHeight,
                      },
                    ]}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.landmarkEmoji}>{emoji}</Text>
                )}
              </View>
            );
          })()}
          
          {/* Landmark Preview - Rendered AFTER existing landmarks so it appears on top during placement */}
          {isPlantingMode && pendingItem && pendingPosition && pendingItem.category === 'landmark' && (
            (() => {
              const previewAsset = getLandmarkAsset(pendingItem.type as LandmarkTypeId);
              const emojiMap: Record<LandmarkTypeId, string> = {
                mountain: '⛰️',
                windmill: '🌾',
                cooling_tower: '🏭',
              };
              const emoji = emojiMap[pendingItem.type as LandmarkTypeId] || '🏔️';
              const { width: landmarkWidth, height: landmarkHeight } = getLandmarkDimensions(pendingItem.type as LandmarkTypeId);
              const offsets = LANDMARK_POSITION_OFFSETS[pendingItem.type as LandmarkTypeId] || { offsetX: 0, offsetY: 0 };
              
              return (
                <View
                  style={[
                    styles.landmarkPreview,
                    {
                      left: pendingPosition.x - landmarkWidth / 2 + offsets.offsetX, // Center landmark preview, apply horizontal offset
                      bottom: -offsets.offsetY, // Landmarks sit at the horizon line (bottom of landmarks layer) - apply vertical offset (positive offsetY = down, so subtract from bottom)
                      width: landmarkWidth,
                      height: landmarkHeight,
                      opacity: isValidPosition ? 1 : 0.8,
                      zIndex: 4, // Maximum z-index for landmarks (same as max existing landmark), rendered last so it appears on top
                    } as any,
                  ]}
                >
                  {hasAsset(previewAsset) ? (
                    <Image
                      source={previewAsset}
                      style={[
                        styles.landmarkImage,
                        {
                          width: landmarkWidth,
                          height: landmarkHeight,
                          transform: [{ scaleX: isFlipped ? -1 : 1 }],
                        },
                      ]}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={[styles.landmarkEmoji, { transform: [{ scaleX: isFlipped ? -1 : 1 }] }]}>{emoji}</Text>
                  )}
                </View>
              );
            })()
          )}
        </View>

        {/* Fence (Above surface, behind flowers, in front of landmarks) */}
        <View style={styles.fenceContainer}>
          <Fence />
        </View>

        {/* Ground Surface (Where flowers are "planted") */}
        <View style={styles.groundSurfaceContainer}>
          <GroundSurface health={effectiveHealth} />
        </View>

        {/* Ground Front (Depth/Front face of the ground) */}
        <View style={styles.groundFrontContainer}>
          <GroundFront health={effectiveHealth} />
        </View>
      </View>

      {/* Extra flowers indicator */}
      {flowerCount > TOTAL_SLOTS && (
        <View style={styles.extraBadge}>
          <Text style={styles.extraText}>+{flowerCount - TOTAL_SLOTS} more flowers</Text>
        </View>
      )}

      {/* Splash Animation Overlay - One splash per flower */}
      <SplashAnimation
        isActive={splashActive}
        positions={splashPositions}
        onComplete={handleSplashComplete}
      />

      {/* Revival Button - Shown when garden is wilted - Above watering button */}
      {effectiveHealth === 'wilted' && onRevive && (
        <RevivalButton
          onPress={onRevive}
          colors={Colors.light}
        />
      )}

      {/* Watering Can Button - Floating - Always visible */}
      <WateringCanButton
        water={water}
        onPress={handleWater}
        onBlocked={onWaterBlocked}
        colors={Colors.light}
        canWater={canWater}
      />

      {/* Dev Tools Toggle Button */}
      <TouchableOpacity
        style={styles.devToolsToggle}
        onPress={() => setShowDevTools(!showDevTools)}
        activeOpacity={0.7}
      >
        <Wrench size={20} color="#666" />
      </TouchableOpacity>

      {/* Dev Tools Panel */}
      {showDevTools && (
        <DevToolsPanel
          devGrowthStage={devGrowthStage}
          devHealth={devHealthOverride}
          onGrowthStageChange={onDevGrowthStageChange || (() => {})}
          onHealthChange={onDevHealthChange || (() => {})}
          onRemoveLastFlower={onDevRemoveLastFlower}
          onAddRose={onDevAddRose}
          onRemoveAllFlowers={onDevRemoveAllFlowers}
          onAddCoins={onDevAddCoins}
          onRemoveAllLandmarks={onDevRemoveAllLandmarks}
          onResetQuestion={onDevResetQuestion}
          onShowPremiumModal={onDevShowPremiumModal}
          showCollisionZones={showCollisionZones}
          onToggleCollisionZones={() => setShowCollisionZones(!showCollisionZones)}
          colors={Colors.light}
        />
      )}

      {/* Planting Mode Overlay - Transparent touch capture layer */}
      {isPlantingMode && pendingItem && pendingPosition && (
        <View 
          style={styles.plantingModeTouchOverlay}
          {...panResponder.panHandlers}
        />
      )}

      {/* Planting Mode Overlay */}
      {isPlantingMode && pendingItem && (
        <>
          {/* Confirm/Cancel/Flip Buttons */}
          <View style={styles.plantingModeControls}>
            <TouchableOpacity
              style={[
                styles.plantingModeButton,
                styles.cancelButton,
                { backgroundColor: '#FF4444' },
              ]}
              onPress={handleCancelPlacement}
              activeOpacity={0.8}
            >
              <X size={24} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.plantingModeButton,
                { backgroundColor: '#2196F3' },
              ]}
              onPress={handleFlip}
              activeOpacity={0.8}
            >
              <FlipHorizontal size={24} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.plantingModeButton,
                styles.confirmButton,
                { 
                  backgroundColor: pendingPosition ? '#4CAF50' : '#CCCCCC',
                  opacity: pendingPosition ? 1 : 0.5,
                },
              ]}
              onPress={handleConfirmPlacement}
              disabled={!pendingPosition || !isValidPosition}
              activeOpacity={0.8}
            >
              <Check size={24} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Placement Error Message - Below buttons, left side */}
          {placementError && (
            <View style={styles.placementErrorBanner}>
              <Text style={styles.placementErrorText}>{placementError}</Text>
            </View>
          )}
        </>
      )}
      
      {/* Edit Landmarks Done Button */}
      {isEditingLandmarks && !draggingLandmarkId && (
        <View style={styles.editLandmarksDoneContainer}>
          <TouchableOpacity
            style={styles.editLandmarksDoneButton}
            onPress={onEditLandmarksDone}
            activeOpacity={0.8}
          >
            <Check size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Global drag overlay for landmarks - always active when in edit mode to capture gestures */}
      {isEditingLandmarks && landmarkDragPanResponder && (
        <View
          style={[
            styles.plantingModeTouchOverlay,
            { pointerEvents: draggingLandmarkId ? 'auto' : 'box-none' }
          ]}
          {...landmarkDragPanResponder.panHandlers}
        />
      )}
    </View>
  );
}

// ============================================
// DEV TOOLS PANEL
// ============================================

function DevToolsPanel({
  devGrowthStage,
  devHealth,
  onGrowthStageChange,
  onHealthChange,
  onRemoveLastFlower,
  onAddRose,
  onRemoveAllFlowers,
  onAddCoins,
  onRemoveAllLandmarks,
  onResetQuestion,
  onShowPremiumModal,
  showCollisionZones,
  onToggleCollisionZones,
  colors,
}: {
  devGrowthStage?: 'sapling' | 'mature';
  devHealth?: 'fresh' | 'wilting' | 'wilted';
  onGrowthStageChange: (stage: 'sapling' | 'mature' | null) => void;
  onHealthChange: (health: 'fresh' | 'wilting' | 'wilted' | null) => void;
  onRemoveLastFlower?: () => void;
  onAddRose?: () => void;
  onRemoveAllFlowers?: () => void;
  onAddCoins?: () => void;
  onRemoveAllLandmarks?: () => void;
  onResetQuestion?: () => void;
  onShowPremiumModal?: () => void;
  showCollisionZones: boolean;
  onToggleCollisionZones: () => void;
  colors: typeof Colors.light;
}) {
  const growthStages: ('sapling' | 'mature' | null)[] = [null, 'sapling', 'mature'];
  const healthStates: ('fresh' | 'wilting' | 'wilted' | null)[] = [null, 'fresh', 'wilting', 'wilted'];

  const getGrowthStageLabel = (stage: typeof growthStages[number]) => {
    if (!stage) return 'Auto';
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  };

  const getHealthLabel = (health: typeof healthStates[number]) => {
    if (!health) return 'Auto';
    return health.charAt(0).toUpperCase() + health.slice(1);
  };

  return (
    <View style={[styles.devToolsPanel, { backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.devToolsTitle, { color: colors.text }]}>Dev Tools</Text>
      
      {/* Growth Stage Controls */}
      <View style={styles.devToolsSection}>
        <Text style={[styles.devToolsLabel, { color: colors.text }]}>Growth Stage:</Text>
        <View style={styles.devToolsButtons}>
          {growthStages.map((stage) => (
            <TouchableOpacity
              key={stage || 'auto'}
              style={[
                styles.devToolsButton,
                devGrowthStage === stage && [styles.devToolsButtonActive, { backgroundColor: colors.tint }],
                { borderColor: colors.border },
              ]}
              onPress={() => onGrowthStageChange(stage)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.devToolsButtonText,
                  { color: devGrowthStage === stage ? '#FFFFFF' : colors.text },
                ]}
              >
                {getGrowthStageLabel(stage)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Health Controls */}
      <View style={styles.devToolsSection}>
        <Text style={[styles.devToolsLabel, { color: colors.text }]}>Health:</Text>
        <View style={styles.devToolsButtons}>
          {healthStates.map((health) => (
            <TouchableOpacity
              key={health || 'auto'}
              style={[
                styles.devToolsButton,
                devHealth === health && [styles.devToolsButtonActive, { backgroundColor: colors.tint }],
                { borderColor: colors.border },
              ]}
              onPress={() => onHealthChange(health)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.devToolsButtonText,
                  { color: devHealth === health ? '#FFFFFF' : colors.text },
                ]}
              >
                {getHealthLabel(health)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Flower Management Controls */}
      <View style={styles.devToolsSection}>
        <Text style={[styles.devToolsLabel, { color: colors.text }]}>Flower Management:</Text>
        <View style={styles.devToolsButtons}>
          <TouchableOpacity
            style={[
              styles.devToolsButton,
              { borderColor: colors.border, backgroundColor: '#ff6b6b' },
            ]}
            onPress={onRemoveLastFlower}
            activeOpacity={0.7}
            disabled={!onRemoveLastFlower}
          >
            <Text style={[styles.devToolsButtonText, { color: '#FFFFFF' }]}>
              Remove Last
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.devToolsButton,
              { borderColor: colors.border, backgroundColor: '#51cf66' },
            ]}
            onPress={onAddRose}
            activeOpacity={0.7}
            disabled={!onAddRose}
          >
            <Text style={[styles.devToolsButtonText, { color: '#FFFFFF' }]}>
              Add Rose
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.devToolsButton,
              { borderColor: colors.border, backgroundColor: '#ff8787' },
            ]}
            onPress={onRemoveAllFlowers}
            activeOpacity={0.7}
            disabled={!onRemoveAllFlowers}
          >
            <Text style={[styles.devToolsButtonText, { color: '#FFFFFF' }]}>
              Remove All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Currency Management Controls */}
      <View style={styles.devToolsSection}>
        <Text style={[styles.devToolsLabel, { color: colors.text }]}>Currency:</Text>
        <View style={styles.devToolsButtons}>
          <TouchableOpacity
            style={[
              styles.devToolsButton,
              { borderColor: colors.border, backgroundColor: '#FFD700' },
            ]}
            onPress={onAddCoins}
            activeOpacity={0.7}
            disabled={!onAddCoins}
          >
            <Text style={[styles.devToolsButtonText, { color: '#FFFFFF' }]}>
              +1000 Coins
            </Text>
          </TouchableOpacity>
          {onResetQuestion && (
            <TouchableOpacity
              style={[
                styles.devToolsButton,
                { borderColor: colors.border, backgroundColor: '#9b59b6' },
              ]}
              onPress={onResetQuestion}
              activeOpacity={0.7}
            >
              <Text style={[styles.devToolsButtonText, { color: '#FFFFFF' }]}>
                Reset Question
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Landmark Management Controls */}
      <View style={styles.devToolsSection}>
        <Text style={[styles.devToolsLabel, { color: colors.text }]}>Landmark Management:</Text>
        <View style={styles.devToolsButtons}>
          <TouchableOpacity
            style={[
              styles.devToolsButton,
              { borderColor: colors.border, backgroundColor: '#ff6b6b' },
            ]}
            onPress={onRemoveAllLandmarks}
            activeOpacity={0.7}
            disabled={!onRemoveAllLandmarks}
          >
            <Text style={[styles.devToolsButtonText, { color: '#FFFFFF' }]}>
              Remove All Landmarks
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Debug Controls */}
      <View style={styles.devToolsSection}>
        <Text style={[styles.devToolsLabel, { color: colors.text }]}>Debug:</Text>
        <View style={styles.devToolsButtons}>
          <TouchableOpacity
            style={[
              styles.devToolsButton,
              showCollisionZones && [styles.devToolsButtonActive, { backgroundColor: colors.tint }],
              { borderColor: colors.border },
            ]}
            onPress={onToggleCollisionZones}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.devToolsButtonText,
                { color: showCollisionZones ? '#FFFFFF' : colors.text },
              ]}
            >
              Show Collision Zones
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Premium Modal Test */}
      {onShowPremiumModal && (
        <View style={styles.devToolsSection}>
          <Text style={[styles.devToolsLabel, { color: colors.text }]}>Testing:</Text>
          <View style={styles.devToolsButtons}>
            <TouchableOpacity
              style={[
                styles.devToolsButton,
                { borderColor: colors.border, backgroundColor: '#FFD700' },
              ]}
              onPress={onShowPremiumModal}
              activeOpacity={0.7}
            >
              <Text style={[styles.devToolsButtonText, { color: '#FFFFFF' }]}>
                Show Premium Modal
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

// Total garden height = flowers area + ground surface + ground front
const TOTAL_GARDEN_HEIGHT = FLOWER_AREA_HEIGHT + GROUND_SURFACE_HEIGHT + GROUND_FRONT_HEIGHT;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: TOTAL_GARDEN_HEIGHT,
    position: 'relative',
  },

  // Stage Container (2.5D Layout)
  stageContainer: {
    height: GROUND_SURFACE_HEIGHT + GROUND_FRONT_HEIGHT + FLOWER_AREA_HEIGHT,
    position: 'relative',
  },

  // Flowers Layer - bottom aligns with where flowers should be "planted"
  // Ground surface starts at bottom: 35px, so flowers layer bottom = 35 + a small offset
  flowersLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: GROUND_FRONT_HEIGHT - 10, // Flowers "planted" just above ground front
    zIndex: 10,
  },

  // Individual Flower Wrapper (Absolute Positioning)
  flowerWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },

  // Flower Anchor Container - fixed size, positions content (20% smaller)
  flowerAnchorContainer: {
    width: 48,
    height: 64,
    position: 'relative',
  },
  // Inner view - absolutely positioned at bottom, then scaled
  flowerAnchorInner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    transformOrigin: 'bottom center', // This doesn't work in RN but documents intent
  },

  // Combined Flower (Head + Stem) - 300x400 aspect ratio scaled down (20% smaller)
  flowerImage: {
    width: 48,
    height: 64, // Maintains ~300:400 aspect ratio
  },
  flowerPlaceholder: {
    width: 48,
    height: 64,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  
  // Sapling (Day 0) - SAME dimensions as flower (300x400 aspect ratio, 20% smaller)
  saplingImage: {
    width: 48,
    height: 40, // Same as flower!
  },
  saplingPlaceholder: {
    width: 48,
    height: 64, // Same as flower!
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: 'rgba(200,255,200,0.3)',
  },
  saplingEmoji: {
    fontSize: 24,
  },
  placeholderHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderStem: {
    width: 8,
    height: 45,
    borderRadius: 4,
    marginTop: -4,
  },
  placeholderText: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  placeholderFilename: {
    position: 'absolute',
    bottom: 2,
    fontSize: 5,
    color: 'rgba(0,0,0,0.4)',
  },

  // Fence (above surface, behind flowers - background separator)
  fenceContainer: {
    position: 'absolute',
    bottom: GROUND_FRONT_HEIGHT - 12 + GROUND_SURFACE_HEIGHT - 6, // Positioned above surface with ~6px overlap (maintains proportional overlap with new height)
    left: 0,
    width: SCREEN_WIDTH, // Exact screen width
    height: GROUND_SURFACE_HEIGHT -10, // Same height as surface
    zIndex: 5, // Above surface (1), below flowers (10+)
    overflow: 'hidden', // Ensure fence doesn't extend beyond container
  },
  fenceImage: {
    width: SCREEN_WIDTH, // Exact screen width, no more
    height: '100%',
  },
  fencePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 90, 43, 0.3)', // Brown fence color
    borderWidth: 1,
    borderColor: 'rgba(139, 90, 43, 0.5)',
    borderStyle: 'dashed',
  },
  fencePlaceholderSpace: {
    backgroundColor: 'rgba(92, 83, 126, 0.3)', // Space accent color (#5c537e with opacity)
    borderColor: 'rgba(22, 23, 43, 0.5)', // Space background color (#16172b with opacity)
  },

  // Landmarks Layer (behind fence, at horizon line)
  landmarksLayer: {
    position: 'absolute',
    bottom: GROUND_FRONT_HEIGHT - 15 + GROUND_SURFACE_HEIGHT, // At top of ground surface (horizon)
    left: 0,
    width: SCREEN_WIDTH,
    height: 200, // 50% of landmark height (400px -> 200px)
    zIndex: 2, // Behind fence (5), above ground surface (1)
    pointerEvents: 'box-none', // Allow children to receive touches, but container doesn't block
  },
  landmarkWrapper: {
    position: 'absolute',
    // Width and height are set dynamically based on landmark type
    alignItems: 'center',
    justifyContent: 'flex-end', // Anchor at bottom
  },
  landmarkImage: {
    width: '100%',
    height: '100%',
  },
  landmarkEmoji: {
    fontSize: 120, // Fallback emoji size
  },
  landmarkPreview: {
    position: 'absolute',
    // Width and height are set dynamically based on landmark type
    alignItems: 'center',
    justifyContent: 'flex-end', // Anchor at bottom
    // zIndex is set inline to be behind fence (5), in landmarks layer (2)
  },

  // Ground Surface (back layer)
  groundSurfaceContainer: {
    position: 'absolute',
    bottom: GROUND_FRONT_HEIGHT - 15, // Adjusted so front overlaps by ~30% (15px)
    left: 0,
    right: 0,
    height: GROUND_SURFACE_HEIGHT,
    zIndex: 1, // Behind the front
  },
  groundSurfaceImage: {
    width: '100%',
    height: '100%',
  },
  groundSurfacePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 3,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  groundLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },

  // Ground Front (foreground layer - ALWAYS in front of everything)
  groundFrontContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: GROUND_FRONT_HEIGHT,
    zIndex: 200, // ALWAYS in front of flowers
  },
  groundFrontImage: {
    width: '100%',
    height: '100%',
  },
  groundFrontPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },

  // Extra Badge
  extraBadge: {
    alignSelf: 'center',
    marginTop: -20,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 100,
  },
  extraText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Watering Can Button
  revivalButton: {
    position: 'absolute',
    right: 16,
    bottom: TOTAL_GARDEN_HEIGHT - 240, // Position above the watering button (70px above)
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 301, // Above watering button
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  wateringCanButton: {
    position: 'absolute',
    right: 16,
    bottom: TOTAL_GARDEN_HEIGHT - 310, // Position above the garden
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.tint, // Blue circle (inverted from white)
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  devToolsToggle: {
    position: 'absolute',
    left: 16,
    bottom: GROUND_FRONT_HEIGHT + 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(200, 200, 200, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  devToolsPanel: {
    position: 'absolute',
    left: 16,
    bottom: GROUND_FRONT_HEIGHT + 70,
    right: 16,
    borderRadius: 12,
    padding: 16,
    zIndex: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  devToolsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  devToolsSection: {
    marginBottom: 16,
  },
  devToolsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  devToolsButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  devToolsButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  devToolsButtonActive: {
    backgroundColor: Colors.light.tint,
  },
  devToolsButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Planting Mode Touch Overlay - Transparent layer for capturing touches
  plantingModeTouchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 350, // Below buttons (400) but above garden content
    backgroundColor: 'transparent',
  },
  // Planting Mode Controls
  plantingModeControls: {
    position: 'absolute',
    bottom: TOTAL_GARDEN_HEIGHT + 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    zIndex: 400,
    paddingHorizontal: 20,
  },
  plantingModeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#FF4444',
  },
  placementErrorBanner: {
    position: 'absolute',
    top: 80, // Higher on screen, over the garden
    left: 20,
    width: 100,
    minHeight: 60,
    maxHeight: 100,
    backgroundColor: '#FF4444',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 400,
    padding: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  placementErrorText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  
  // Collision Zone - Red no-go area around existing flowers
  collisionZone: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    borderWidth: 2,
    borderColor: '#FF4444',
    borderStyle: 'dashed',
    zIndex: 50,
  },
  
  // Sapling Hitbox - Larger touch area for dragging
  saplingHitbox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Draggable Sapling Container
  draggableSapling: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  
  // Sapling Highlight - Makes the sapling more visible
  saplingHighlight: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Context Menu
  contextMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 500,
  },
  contextMenuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent', // No dark overlay
  },
  contextMenu: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 501,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 8,
  },
  contextMenuItemDanger: {
    // No special styling, just for reference
  },
  contextMenuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  contextMenuTextDanger: {
    color: '#FF4444',
  },
  
  // Edit Landmarks Done Button
  editLandmarksDoneContainer: {
    position: 'absolute',
    top: 80,
    right: 16,
    zIndex: 500,
  },
  editLandmarksDoneButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  
  // Landmark Delete Button (X icon in corner)
  landmarkDeleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});

export default Garden;
