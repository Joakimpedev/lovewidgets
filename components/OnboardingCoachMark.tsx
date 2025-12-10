/**
 * Onboarding Coach Mark Component
 * Creates a spotlight/pulse effect to highlight UI elements during onboarding
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Platform, StyleSheet, Text, TouchableOpacity, View, Image, Dimensions } from 'react-native';
import { Colors } from '@/constants/Colors';
import { hasAsset, UIAssets } from '@/constants/Assets';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HighlightArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CoachMarkProps {
  visible: boolean;
  message: string | React.ReactNode;
  onDismiss?: () => void;
  showDismissButton?: boolean;
  position?: 'top' | 'bottom' | 'center';
  highlightArea?: HighlightArea; // Area to highlight (spotlight effect)
}

export function OnboardingCoachMark({
  visible,
  message,
  onDismiss,
  showDismissButton = false,
  position = 'bottom',
  highlightArea,
}: CoachMarkProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      fadeAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible, fadeAnim, pulseAnim]);

  if (!visible) return null;

  const positionStyle = {
    top: position === 'top' ? 100 : undefined,
    bottom: position === 'bottom' ? 100 : undefined,
    alignSelf: position === 'center' ? 'center' : 'stretch',
    marginTop: position === 'center' ? 'auto' : undefined,
    marginBottom: position === 'center' ? 'auto' : undefined,
  };

  // Create spotlight effect with dark overlay and cutout
  const renderSpotlightOverlay = () => {
    if (!highlightArea) return null;

    const { x, y, width, height } = highlightArea;
    const padding = 20; // Extra padding around highlighted area
    const highlightX = Math.max(0, x - padding);
    const highlightY = Math.max(0, y - padding);
    const highlightWidth = width + padding * 2;
    const highlightHeight = height + padding * 2;

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Top dark area */}
        {highlightY > 0 && (
          <View style={[styles.darkArea, { 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: highlightY,
          }]} />
        )}
        
        {/* Left dark area (above highlight) */}
        {highlightX > 0 && (
          <View style={[styles.darkArea, { 
            position: 'absolute',
            top: highlightY,
            left: 0,
            width: highlightX,
            height: highlightHeight,
          }]} />
        )}
        
        {/* Right dark area (above highlight) */}
        <View style={[styles.darkArea, { 
          position: 'absolute',
          top: highlightY,
          left: highlightX + highlightWidth,
          right: 0,
          height: highlightHeight,
        }]} />
        
        {/* Bottom dark area */}
        <View style={[styles.darkArea, { 
          position: 'absolute',
          top: highlightY + highlightHeight,
          left: 0,
          right: 0,
          bottom: 0,
        }]} />
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        {/* No spotlight overlay here - popup shows without darkening */}
        <Animated.View
          style={[
            styles.container,
            positionStyle,
            {
              opacity: fadeAnim,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {typeof message === 'string' ? (
            <Text style={styles.message}>{message}</Text>
          ) : (
            <View style={styles.messageContainer}>{message}</View>
          )}
          {showDismissButton && onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissButtonText}>Got it</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Lighter overlay for popup only
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    maxWidth: 320,
    zIndex: 10, // Ensure it's above the dark overlay
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  messageContainer: {
    alignItems: 'center',
  },
  dismissButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    alignSelf: 'center',
  },
  dismissButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

