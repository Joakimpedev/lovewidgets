/**
 * Garden Component for LoveWidgets
 * 2.5D "Stage Perspective" layout with depth simulation
 * Flowers are scattered on a surface with front/back depth
 * 
 * Growth Stages:
 * - sapling: Day 0 (just planted) - shows sapling image
 * - growing: Day 1 - shows flower at 50% size
 * - mature: Day 2+ - shows flower at full size
 */

import {
  FlowerType,
  FlowerVariant,
  HealthStatus,
  getFlowerAsset,
  getGroundAsset,
  getGroundFrontAsset,
  getSaplingAsset,
  hasAsset,
} from '@/constants/Assets';
import { Colors } from '@/constants/Colors';
import {
  FlowerHealth,
  PlantedFlower,
  getGrowthScale,
  getGrowthStage
} from '@/utils/gardenState';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Layout constants
const GROUND_SURFACE_HEIGHT = 50;
const GROUND_FRONT_HEIGHT = 50; // Same height as surface
const FLOWER_AREA_HEIGHT = 160;
const HORIZONTAL_PADDING = 20;

// ============================================
// TYPES
// ============================================

interface GardenProps {
  flowers: PlantedFlower[]; // Individual planted flowers with growth data
  flowerCount: number; // Total level (for display)
  health: FlowerHealth;
  streakProgress: number;
}

interface FlowerProps {
  flower: PlantedFlower; // Individual flower data
  health: HealthStatus;
  slotIndex: number;
  depthPosition: 'front' | 'back';
}

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
 * Same 100px height as flower for consistent anchoring
 */
function SaplingImage({ variant }: { variant: FlowerVariant }) {
  const asset = getSaplingAsset(variant);

  if (hasAsset(asset)) {
    return (
      <Image
        source={asset}
        style={styles.saplingImage}
        resizeMode="contain"
      />
    );
  }

  // Placeholder for sapling - same 100px height as flower
  return (
    <View style={styles.saplingPlaceholder}>
      <Text style={styles.saplingEmoji}>🌱</Text>
      <Text style={styles.placeholderFilename}>sapling_{variant}.png</Text>
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
  const isBent = health !== 'fresh';

  if (hasAsset(asset)) {
    return (
      <Image
        source={asset}
        style={[
          styles.flowerImage,
          isBent && { transform: [{ rotate: '-5deg' }] },
        ]}
        resizeMode="contain"
      />
    );
  }

  // Placeholder: combined head + stem visual
  return (
    <View style={[styles.flowerPlaceholder, isBent && { transform: [{ rotate: '-5deg' }] }]}>
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
 * Complete Flower Component with Growth Stages
 * 
 * Growth stages:
 * - sapling: Day 0 - shows sapling
 * - growing: Day 1 - shows flower at 50% size
 * - mature: Day 2+ - shows flower at full size
 */
function Flower({ flower, health, slotIndex, depthPosition }: FlowerProps) {
  const growthStage = getGrowthStage(flower.plantedAt);
  const growthScale = getGrowthScale(growthStage);
  
  // Scale based on depth (back flowers slightly smaller)
  const depthScale = depthPosition === 'back' ? 0.85 : 1.0;
  // Slight random variation based on slot
  const scaleVariation = 0.9 + ((slotIndex * 7) % 3) * 0.1;
  
  const isSapling = growthStage === 'sapling';
  
  // All stages use the same scale calculation
  const finalScale = depthScale * scaleVariation * growthScale;
  
  // Both sapling and flower images are same size (60x80, matching 300:400 aspect)
  const IMAGE_HEIGHT = 80;
  
  // With absolute positioning at bottom: 0, scaling moves the bottom UP
  // Compensate by translating DOWN (negative Y in absolute bottom context)
  // Actually: scale shrinks from center, bottom moves up by (1-scale)*height/2
  // To fix: translate the scaled element down by that amount
  const bottomCompensation = ((1 - finalScale) * IMAGE_HEIGHT) / 2;

  return (
    <View style={styles.flowerAnchorContainer}>
      <View 
        style={[
          styles.flowerAnchorInner, 
          { 
            // Scale first, then translate to keep bottom anchored
            transform: [
              { scale: finalScale },
              { translateY: bottomCompensation },
            ],
          }
        ]}
      >
        {isSapling ? (
          <SaplingImage variant={flower.variant} />
        ) : (
          <FlowerImage type={flower.type} variant={flower.variant} health={health} />
        )}
      </View>
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

/**
 * FIXED flower positions - each slot has a predetermined spot
 * When new flowers are added, existing flowers DON'T move
 * 
 * Layout: Clustered in center, gradually filling outward
 * Position 0 = center, then alternating left/right
 */
const FIXED_FLOWER_SLOTS: Array<{ xOffset: number; bottom: number }> = [
  { xOffset: 0, bottom: 12 },     // 1st flower: center, mid-depth
  { xOffset: -30, bottom: 8 },    // 2nd: left, front
  { xOffset: 25, bottom: 20 },    // 3rd: right, back
  { xOffset: -15, bottom: 28 },   // 4th: slight left, far back
  { xOffset: 40, bottom: 4 },     // 5th: far right, very front
  { xOffset: -50, bottom: 16 },   // 6th: far left, mid
  { xOffset: 10, bottom: 0 },     // 7th: slight right, very front
  { xOffset: -40, bottom: 24 },   // 8th: left, back
  { xOffset: 55, bottom: 14 },    // 9th: far right, mid
];

/**
 * Calculate positions for planted flowers
 * Uses the flower's slot property to determine position
 */
function calculateFlowerPositions(flowers: PlantedFlower[]): FlowerPosition[] {
  const positions: FlowerPosition[] = [];
  
  // Handle empty/undefined flowers array
  if (!flowers || flowers.length === 0) {
    return positions;
  }
  
  const centerX = SCREEN_WIDTH / 2 - 25; // Center minus half flower width

  for (const flower of flowers) {
    if (!flower) continue; // Skip undefined flowers
    
    const slotIndex = flower.slot;
    if (slotIndex >= FIXED_FLOWER_SLOTS.length) continue; // Skip if beyond max slots
    
    const slot = FIXED_FLOWER_SLOTS[slotIndex];
    
    // Fixed horizontal position from center
    const left = centerX + slot.xOffset;
    
    // Fixed vertical position (bottom value)
    const bottom = slot.bottom;
    
    // Depth position for scaling (lower bottom = front)
    const depthPosition: 'front' | 'back' = bottom < 14 ? 'front' : 'back';

    // Z-index: LOWER bottom = FRONT = HIGHER z-index (renders on top)
    const zIndex = 100 - bottom;

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

// ============================================
// MAIN GARDEN COMPONENT
// ============================================

export function Garden({ flowers, flowerCount, health, streakProgress }: GardenProps) {
  const flowerPositions = calculateFlowerPositions(flowers);

  return (
    <View style={styles.container}>
      {/* Stage Container (2.5D Perspective) */}
      <View style={styles.stageContainer}>
        {/* Flowers Layer (Absolute, over the ground surface) */}
        <View style={styles.flowersLayer}>
          {flowerPositions.map((pos, index) => (
            <View
              key={index}
              style={[
                styles.flowerWrapper,
                {
                  left: pos.left,
                  bottom: pos.bottom,
                  zIndex: pos.zIndex,
                },
              ]}
            >
              <Flower
                flower={pos.flower}
                health={health}
                slotIndex={pos.flower.slot}
                depthPosition={pos.depthPosition}
              />
            </View>
          ))}
        </View>

        {/* Ground Surface (Where flowers are "planted") */}
        <View style={styles.groundSurfaceContainer}>
          <GroundSurface health={health} />
        </View>

        {/* Ground Front (Depth/Front face of the ground) */}
        <View style={styles.groundFrontContainer}>
          <GroundFront health={health} />
        </View>
      </View>

      {/* Extra flowers indicator */}
      {flowerCount > 9 && (
        <View style={styles.extraBadge}>
          <Text style={styles.extraText}>+{flowerCount - 9} more flowers</Text>
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

  // Flower Anchor Container - fixed size, positions content
  flowerAnchorContainer: {
    width: 60,
    height: 80,
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

  // Combined Flower (Head + Stem) - 300x400 aspect ratio scaled down
  flowerImage: {
    width: 60,
    height: 80, // Maintains ~300:400 aspect ratio
  },
  flowerPlaceholder: {
    width: 60,
    height: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  
  // Sapling (Day 0) - SAME dimensions as flower (300x400 aspect ratio)
  saplingImage: {
    width: 60,
    height: 80, // Same as flower!
  },
  saplingPlaceholder: {
    width: 60,
    height: 80, // Same as flower!
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
});

export default Garden;
