/**
 * Spotlight Overlay Component
 * Creates a darkened screen with a circular, feathered highlight around a specific area
 */

import React from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Mask, RadialGradient, Rect, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HighlightArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpotlightOverlayProps {
  visible: boolean;
  highlightArea: HighlightArea | null;
  onDismiss?: () => void;
  onHighlightTap?: () => void; // Called when user taps on the highlighted area
}

export function SpotlightOverlay({
  visible,
  highlightArea,
  onDismiss,
  onHighlightTap,
}: SpotlightOverlayProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animation when hidden
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim]);

  // Don't render anything if not visible - this ensures Modal is completely removed
  if (!visible || !highlightArea) {
    return null;
  }

  const { x, y, width, height } = highlightArea;
  // Calculate center coordinates - ensure they're within screen bounds
  const centerX = Math.max(0, Math.min(SCREEN_WIDTH, x + width / 2));
  const centerY = Math.max(0, Math.min(SCREEN_HEIGHT, y + height / 2));
  
  // ============================================
  // FINE-TUNING CONTROLS - Adjust these values:
  // ============================================
  const HIGHLIGHT_PADDING = 15; // Extra padding around the button (pixels) - increase for larger highlight
  const FEATHER_SIZE = 50; // Size of the feathering effect (pixels) - larger = softer edge, smaller = sharper edge
  const DARK_OVERLAY_OPACITY = 0.4; // Darkness of the overlay (0.0 = transparent, 1.0 = fully opaque)
  const DARK_OVERLAY_COLOR = `rgba(0, 0, 0, ${DARK_OVERLAY_OPACITY})`; // Color of the dark overlay
  // To change color: replace '0, 0, 0' with RGB values (e.g., '50, 50, 50' for gray)
  
  // Feathering gradient stops - adjust these percentages to change feather intensity:
  const FEATHER_START = 0; // Where feathering starts (0% = center, higher = starts further out)
  const FEATHER_MID = 10; // Mid-point of feather (percentage added to gradientRadius)
  const FEATHER_END = 25; // End of feather transition (percentage added to gradientRadius)
  // ============================================
  
  const radius = Math.max(width, height) / 2 + HIGHLIGHT_PADDING;
  const outerRadius = radius + FEATHER_SIZE;
  const gradientRadius = (radius / outerRadius) * 120; // Percentage where solid highlight ends

  const handlePress = (event: any) => {
    if (!highlightArea) return;
    
    // Use pageX/pageY which are window-relative coordinates
    // These should match the coordinates from measureInWindow
    const { pageX, pageY } = event.nativeEvent;
    
    // Check if tap is within the highlighted area
    const isWithinHighlight = 
      pageX >= highlightArea.x &&
      pageX <= highlightArea.x + highlightArea.width &&
      pageY >= highlightArea.y &&
      pageY <= highlightArea.y + highlightArea.height;
    
    if (isWithinHighlight && onHighlightTap) {
      // Tap is on the highlighted area - call the highlight tap handler
      onHighlightTap();
    } else if (onDismiss) {
      // Tap is outside - just dismiss
      onDismiss();
    }
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={onDismiss}
      statusBarTranslucent={true}
    >
      <Pressable 
        style={styles.container} 
        onPress={handlePress}
        android_ripple={null}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
          <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            {/* Radial gradient for feathering effect */}
            {/* In SVG masks: white = show overlay (dark), black = hide overlay (transparent) */}
            {/* This gradient goes from black (center, transparent) to white (edges, dark) */}
            {/* Adjust stop offsets and opacities below to fine-tune feathering: */}
            <RadialGradient id="spotlightGradient" cx="50%" cy="50%">
              <Stop offset="0%" stopColor="black" stopOpacity="1" />
              <Stop offset={`${gradientRadius}%`} stopColor="black" stopOpacity="1" />
              <Stop offset={`${gradientRadius + FEATHER_START}%`} stopColor="black" stopOpacity="0.7" />
              <Stop offset={`${gradientRadius + FEATHER_MID}%`} stopColor="black" stopOpacity="0.3" />
              <Stop offset={`${gradientRadius + FEATHER_END}%`} stopColor="white" stopOpacity="0" />
              <Stop offset="100%" stopColor="white" stopOpacity="0" />
            </RadialGradient>
            
            {/* Mask: white = show overlay (dark), black = hide overlay (transparent) */}
            <Mask id="circularMask">
              {/* Start with full white rectangle (show dark overlay everywhere) */}
              <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="white" />
              {/* Then add black circle with gradient (hide overlay in circular area with feathering) */}
              <Circle
                cx={centerX}
                cy={centerY}
                r={outerRadius}
                fill="url(#spotlightGradient)"
              />
            </Mask>
          </Defs>
          
          {/* Full screen dark overlay - entire screen is dark except where mask hides it */}
          {/* Change DARK_OVERLAY_COLOR constant above to adjust color/opacity */}
          <Rect
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            fill={DARK_OVERLAY_COLOR}
            mask="url(#circularMask)"
          />
          </Svg>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

