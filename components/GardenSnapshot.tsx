/**
 * GardenSnapshot Component
 * Renders a garden snapshot exactly as it appears in the main Garden component
 * Uses the same positioning logic and layout structure
 */

import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import {
  FlowerType,
  FlowerVariant,
  getFlowerAsset,
  getLandmarkAsset,
  getGroundAsset,
  getGroundFrontAsset,
  getFenceAsset,
  getSaplingAsset,
  getPlantCategory,
  hasAsset,
} from '@/constants/Assets';
import { getSaplingDimensions, SAPLING_POSITION_OFFSETS } from './Garden';
import { PlantedFlower, PlantedLandmark, getGrowthStage, getGrowthScale } from '@/utils/gardenState';
import { FlowerTypeId } from '@/constants/FlowerMarket';
import { getThemeConfig, VisualThemeId } from '@/constants/ThemeConfig';

// Reference dimensions (matching Garden.tsx exactly)
const SCREEN_WIDTH = Dimensions.get('window').width;
const GROUND_SURFACE_HEIGHT = 62;
const GROUND_FRONT_HEIGHT = 62;
const FLOWER_AREA_HEIGHT = 196;
const HORIZON_Y = 50;
const TOTAL_GARDEN_HEIGHT = FLOWER_AREA_HEIGHT + GROUND_SURFACE_HEIGHT + GROUND_FRONT_HEIGHT;

// Flower dimensions (matching Garden.tsx)
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

const FLOWER_SCALE_FACTORS: Record<FlowerType, number> = {
  rose: 1.0,
  tulip: 1.0,
  morning_glory: 1.1,
  pumpkin: 1.0,
  apple_tree: 1.0,
  watermelon: 1.0,
  orchid: 1.2,
  strawberry: 0.7,
};

const LANDMARK_DIMENSIONS: Record<string, { width: number; height: number }> = {
  mountain: { width: 400, height: 266 },
  windmill: { width: 300, height: 300 },
  cooling_tower: { width: 300, height: 300 },
};

const LANDMARK_POSITION_OFFSETS: Record<string, { offsetX: number; offsetY: number }> = {
  mountain: { offsetX: 0, offsetY: 0 },
  windmill: { offsetX: 0, offsetY: 50 },
  cooling_tower: { offsetX: 0, offsetY: 0 },
};

const MATURE_PLANT_POSITION_OFFSETS: Record<FlowerTypeId, { offsetX: number; offsetY: number }> = {
  rose: { offsetX: 0, offsetY: 0 },
  tulip: { offsetX: 0, offsetY: 0 },
  morning_glory: { offsetX: 0, offsetY: 0 },
  pumpkin: { offsetX: 0, offsetY: 25 },
  apple_tree: { offsetX: 3, offsetY: 10 },
  watermelon: { offsetX: 0, offsetY: 25 },
  orchid: { offsetX: 0, offsetY: 0 },
  strawberry: { offsetX: 0, offsetY: 0 },
};

interface GardenSnapshotProps {
  flowers: PlantedFlower[];
  landmarks: PlantedLandmark[];
  themeId: VisualThemeId;
  scale?: number; // Scale factor (default 1.0 for full size)
  cropMode?: boolean; // If true, align garden to bottom (for square crop)
}

/**
 * Get flower dimensions based on type (matching Garden.tsx)
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
 * Calculate flower positions (matching Garden.tsx calculateFlowerPositions exactly)
 */
interface FlowerPosition {
  left: number;
  bottom: number;
  zIndex: number;
  flower: PlantedFlower;
}

function calculateFlowerPositions(flowers: PlantedFlower[]): FlowerPosition[] {
  const positions: FlowerPosition[] = [];
  
  if (!flowers || flowers.length === 0) {
    return positions;
  }
  
  for (const flower of flowers) {
    if (!flower) continue;
    
    let left: number;
    let bottom: number;
    
    if (flower.x !== undefined && flower.y !== undefined) {
      // Coordinate-based positioning (same as Garden.tsx)
      const growthStage = getGrowthStage(flower.plantedAt, flower.type);
      const isSapling = growthStage === 'sapling';
      const actualImageWidth = isSapling 
        ? getSaplingDimensions(getPlantCategory(flower.type)).width 
        : getFlowerDimensions(flower.type).width;
      const halfImageWidth = actualImageWidth / 2;
      
      let baseLeft = flower.x - halfImageWidth;
      let baseBottom = flower.y;
      
      // Apply position offsets based on growth stage
      if (isSapling) {
        // Apply sapling position offsets based on plant category
        const category = getPlantCategory(flower.type);
        const saplingOffsets = SAPLING_POSITION_OFFSETS[category] || { offsetX: 0, offsetY: 0 };
        baseLeft += saplingOffsets.offsetX;
        baseBottom -= saplingOffsets.offsetY;
      } else {
        // Apply mature plant position offsets for mature plants
        const matureOffsets = MATURE_PLANT_POSITION_OFFSETS[flower.type] || { offsetX: 0, offsetY: 0 };
        baseLeft += matureOffsets.offsetX;
        baseBottom -= matureOffsets.offsetY;
      }
      
      left = baseLeft;
      bottom = baseBottom;
    } else {
      continue; // Skip invalid flowers
    }
    
    // Depth position for z-index
    const depthPosition: 'front' | 'back' = bottom < 25 ? 'front' : 'back';
    const maxDepth = 50;
    const zIndex = Math.round((maxDepth - bottom) * 4);
    
    positions.push({
      left,
      bottom,
      zIndex,
      flower,
    });
  }
  
  return positions;
}

export function GardenSnapshot({ 
  flowers, 
  landmarks, 
  themeId, 
  scale = 1.0,
  cropMode = false,
}: GardenSnapshotProps) {
  const theme = getThemeConfig(themeId);
  const flowerPositions = calculateFlowerPositions(flowers);

  // Calculate scaled dimensions - render everything at actual scaled size
  const scaledWidth = SCREEN_WIDTH * scale;
  const scaledHeight = TOTAL_GARDEN_HEIGHT * scale;

  return (
    <View
      style={[
        styles.container,
        {
          width: scaledWidth,
          height: scaledHeight,
          justifyContent: cropMode ? 'flex-end' : 'flex-start',
          overflow: 'hidden',
        },
      ]}
    >
      {/* Stage Container - Render at scaled size directly */}
      <View
        style={[
          styles.stageContainer,
          {
            width: scaledWidth,
            height: scaledHeight,
          },
        ]}
      >
        {/* Background Image */}
        {theme.backgroundImage && hasAsset(theme.backgroundImage) ? (
          <Image
            source={theme.backgroundImage}
            style={[
              styles.backgroundImage,
              {
                width: scaledWidth,
                height: scaledHeight,
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.backgroundImage, { width: scaledWidth, height: scaledHeight, backgroundColor: '#E8F5E9' }]} />
        )}

        {/* Landmarks Layer (behind fence, at horizon line) */}
        <View
          style={[
            styles.landmarksLayer,
            {
              bottom: (GROUND_FRONT_HEIGHT - 15 + GROUND_SURFACE_HEIGHT) * scale,
              left: 0,
              width: scaledWidth,
              height: 200 * scale,
            },
          ]}
        >
          {landmarks
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((landmark) => {
              const dims = LANDMARK_DIMENSIONS[landmark.type] || { width: 300, height: 200 };
              const asset = getLandmarkAsset(landmark.type);
              const offsets = LANDMARK_POSITION_OFFSETS[landmark.type] || { offsetX: 0, offsetY: 0 };

              if (!hasAsset(asset)) return null;

              return (
                <View
                  key={landmark.id}
                  style={[
                    styles.landmarkWrapper,
                    {
                      left: (landmark.x - dims.width / 2 + offsets.offsetX) * scale,
                      bottom: -offsets.offsetY * scale,
                      width: dims.width * scale,
                      height: dims.height * scale,
                    },
                  ]}
                >
                  <Image
                    source={asset}
                    style={styles.landmarkImage}
                    resizeMode="contain"
                  />
                </View>
              );
            })}
        </View>

        {/* Fence Container */}
        <View
          style={[
            styles.fenceContainer,
            {
              bottom: (GROUND_FRONT_HEIGHT - 12 + GROUND_SURFACE_HEIGHT - 6) * scale,
              left: 0,
              width: scaledWidth,
              height: (GROUND_SURFACE_HEIGHT - 10) * scale,
            },
          ]}
        >
          {theme.fenceImage && hasAsset(theme.fenceImage) ? (
            <Image
              source={theme.fenceImage}
              style={styles.fenceImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.fencePlaceholder} />
          )}
        </View>

        {/* Flowers Layer */}
        <View
          style={[
            styles.flowersLayer,
            {
              top: 0,
              left: 0,
              right: 0,
              bottom: (GROUND_FRONT_HEIGHT - 10) * scale,
            },
          ]}
        >
          {flowerPositions.map((pos) => {
            const growthStage = getGrowthStage(pos.flower.plantedAt, pos.flower.type);
            const growthScale = getGrowthScale(growthStage);
            const isSapling = growthStage === 'sapling';
            const dims = isSapling 
              ? getSaplingDimensions(getPlantCategory(pos.flower.type))
              : getFlowerDimensions(pos.flower.type);

            // Get asset
            const asset = isSapling
              ? getSaplingAsset(pos.flower.type, pos.flower.variant)
              : getFlowerAsset(pos.flower.type, pos.flower.variant, 'fresh');

            if (!hasAsset(asset)) return null;

            return (
              <View
                key={pos.flower.id}
                style={[
                  styles.flowerWrapper,
                  {
                    left: pos.left * scale,
                    bottom: pos.bottom * scale,
                    zIndex: pos.zIndex,
                  } as any,
                ]}
              >
                <View style={[styles.flowerAnchorContainer, { width: dims.width * scale, height: dims.height * scale }]}>
                  <View
                    style={[
                      styles.flowerAnchorInner,
                      {
                        transform: [{ scale: growthScale }],
                      },
                    ]}
                  >
                    <Image
                      source={asset}
                      style={[
                        styles.flowerImage,
                        {
                          width: dims.width * scale,
                          height: dims.height * scale,
                        },
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Ground Surface */}
        <View
          style={[
            styles.groundSurfaceContainer,
            {
              bottom: (GROUND_FRONT_HEIGHT - 15) * scale,
              left: 0,
              right: 0,
              height: GROUND_SURFACE_HEIGHT * scale,
            },
          ]}
        >
          {hasAsset(getGroundAsset('fresh')) ? (
            <Image
              source={getGroundAsset('fresh')}
              style={styles.groundSurfaceImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.groundSurfacePlaceholder} />
          )}
        </View>

        {/* Ground Front */}
        <View
          style={[
            styles.groundFrontContainer,
            {
              bottom: 0,
              left: 0,
              right: 0,
              height: GROUND_FRONT_HEIGHT * scale,
            },
          ]}
        >
          {hasAsset(getGroundFrontAsset('fresh')) ? (
            <Image
              source={getGroundFrontAsset('fresh')}
              style={styles.groundFrontImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.groundFrontPlaceholder} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  stageContainer: {
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  landmarksLayer: {
    position: 'absolute',
    zIndex: 2,
  },
  landmarkWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  landmarkImage: {
    width: '100%',
    height: '100%',
  },
  fenceContainer: {
    position: 'absolute',
    zIndex: 5,
    overflow: 'hidden',
  },
  fenceImage: {
    width: '100%',
    height: '100%',
  },
  fencePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(139, 90, 43, 0.3)',
  },
  flowersLayer: {
    position: 'absolute',
    zIndex: 10,
  },
  flowerWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  flowerAnchorContainer: {
    position: 'relative',
  },
  flowerAnchorInner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  flowerImage: {
    // Dimensions set inline
  },
  groundSurfaceContainer: {
    position: 'absolute',
    zIndex: 1,
  },
  groundSurfaceImage: {
    width: '100%',
    height: '100%',
  },
  groundSurfacePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#5D8A30',
  },
  groundFrontContainer: {
    position: 'absolute',
    zIndex: 0,
  },
  groundFrontImage: {
    width: '100%',
    height: '100%',
  },
  groundFrontPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#5D8A30',
  },
});
