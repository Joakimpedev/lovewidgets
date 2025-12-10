/**
 * First Plant Tip Toast
 * Shows a toast message after first flower is planted
 */

import { Colors } from '@/constants/Colors';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

interface FirstPlantTipToastProps {
  visible: boolean;
  onHide: () => void;
}

export function FirstPlantTipToast({ visible, onHide }: FirstPlantTipToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after 8 seconds (5 + 3 more)
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 50,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide();
        });
      }, 8000);

      return () => clearTimeout(timer);
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, fadeAnim, slideAnim, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.emoji}>🌱</Text>
      <View style={styles.textContainer}>
        <Text style={styles.title}>You planted your first flower!</Text>
        <Text style={styles.tip}>
          Tip: Water the garden daily to prevent wilting. Only one of you needs to water to save the plants... but if you{' '}
          <Text style={styles.bold}>both</Text> do, you might get a surprise.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emoji: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  tip: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
    color: Colors.light.text,
  },
});

