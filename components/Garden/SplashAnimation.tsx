/**
 * Splash Animation Component
 * Water droplet splash effect for garden watering interaction
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Garden area constants for positioning
// The garden is 260px tall (160 flowers + 50 surface + 50 front)
// Flowers layer bottom is at GROUND_FRONT_HEIGHT - 10 = 40px from bottom
const FLOWERS_LAYER_BOTTOM = 40; // Distance from bottom of screen to flowers layer bottom

// Number of droplets
const DROPLET_COUNT = 7;

// Animation duration
const ANIMATION_DURATION = 700;

interface SplashPosition {
  x: number; // X position (left)
  y: number; // Y position (top)
}

interface SplashAnimationProps {
  isActive: boolean;
  positions: SplashPosition[]; // Array of positions where splashes should appear (one per flower)
  onComplete?: () => void;
}

interface DropletConfig {
  angle: number; // Random angle in radians
  distance: number; // Random distance to travel
  delay: number; // Random delay (0-100ms)
  size: number; // Random size variation
}

/**
 * Generate random droplet configurations
 */
function generateDropletConfigs(): DropletConfig[] {
  return Array.from({ length: DROPLET_COUNT }, () => ({
    angle: Math.random() * Math.PI * 2, // Full circle
    distance: 25 + Math.random() * 35, // 25-60 pixels (smaller for more realistic splash)
    delay: Math.random() * 100, // 0-100ms
    size: 4 + Math.random() * 5, // 4-9 pixels (varied sizes for more organic look)
  }));
}

/**
 * Individual Droplet Component
 */
function Droplet({
  config,
  baseX,
  baseY,
  onAnimationComplete,
}: {
  config: DropletConfig;
  baseX: number; // Base X position for this splash
  baseY: number; // Base Y position for this splash
  onAnimationComplete: () => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Calculate end position based on angle and distance
    const endX = Math.cos(config.angle) * config.distance;
    const endY = Math.sin(config.angle) * config.distance;

    // Start animation after delay
    const startDelay = config.delay;
    const animationDuration = ANIMATION_DURATION - startDelay;

    setTimeout(() => {
      // Move outward
      translateX.value = withTiming(endX, {
        duration: animationDuration,
        easing: Easing.out(Easing.quad),
      });
      translateY.value = withTiming(endY, {
        duration: animationDuration,
        easing: Easing.out(Easing.quad),
      });

      // Scale up quickly then fade out (splash effect)
      scale.value = withSequence(
        withTiming(1.5, {
          duration: animationDuration * 0.2,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(1.0, {
          duration: animationDuration * 0.3,
          easing: Easing.in(Easing.quad),
        }),
        withTiming(0.6, {
          duration: animationDuration * 0.5,
          easing: Easing.in(Easing.quad),
        })
      );

      // Fade out
      opacity.value = withTiming(0, {
        duration: animationDuration,
        easing: Easing.out(Easing.quad),
      }, () => {
        runOnJS(onAnimationComplete)();
      });
    }, startDelay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  // Center the droplet on its position
  const dropletOffset = -config.size / 2;

  return (
    <Animated.View
      style={[
        styles.droplet,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: '#60A5FA', // Lighter blue for more visible splash
          left: baseX + dropletOffset,
          top: baseY + dropletOffset,
        },
        animatedStyle,
      ]}
    />
  );
}

/**
 * Main Splash Animation Component
 * Creates one splash per flower position
 */
export function SplashAnimation({ isActive, positions, onComplete }: SplashAnimationProps) {
  const [splashConfigs, setSplashConfigs] = React.useState<Array<{
    position: SplashPosition;
    droplets: DropletConfig[];
  }>>([]);
  const [completedCount, setCompletedCount] = React.useState(0);
  const positionsRef = React.useRef(positions);

  // Update ref when positions change
  React.useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    if (isActive && positionsRef.current.length > 0) {
      // Generate splash configs for each flower position
      const configs = positionsRef.current.map((pos) => ({
        position: pos,
        droplets: generateDropletConfigs(),
      }));
      setSplashConfigs(configs);
      setCompletedCount(0);
    } else if (!isActive) {
      // Reset when inactive
      setSplashConfigs([]);
      setCompletedCount(0);
    }
  }, [isActive]); // Only depend on isActive

  const totalDroplets = splashConfigs.reduce((sum, config) => sum + config.droplets.length, 0);

  const handleDropletComplete = React.useCallback(() => {
    setCompletedCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= totalDroplets && onComplete) {
        // All droplets from all splashes completed
        setTimeout(() => {
          onComplete();
        }, 100);
      }
      return newCount;
    });
  }, [totalDroplets, onComplete]);

  if (!isActive || splashConfigs.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {splashConfigs.map((splashConfig, splashIndex) =>
        splashConfig.droplets.map((dropletConfig, dropletIndex) => (
          <Droplet
            key={`${splashIndex}-${dropletIndex}`}
            config={dropletConfig}
            baseX={splashConfig.position.x}
            baseY={splashConfig.position.y}
            onAnimationComplete={handleDropletComplete}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 250, // Above garden elements but below UI buttons
    pointerEvents: 'none',
  },
  droplet: {
    position: 'absolute',
  },
});

