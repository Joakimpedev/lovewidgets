/**
 * Harmony Bonus Modal
 * 
 * Shown when both partners water the plant on the same day (harmony bonus).
 * Displays "+1 Gold - Harmony Bonus!" message.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Coins, Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

interface HarmonyBonusModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HarmonyBonusModal({
  visible,
  onClose,
}: HarmonyBonusModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Sparkle loop animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Auto-dismiss after 2.5 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClose();
        });
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, onClose]);

  const sparkleRotate = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Sparkles */}
          <Animated.View style={[styles.sparkleLeft, { transform: [{ rotate: sparkleRotate }] }]}>
            <Sparkles size={24} color="#FFD700" />
          </Animated.View>
          <Animated.View style={[styles.sparkleRight, { transform: [{ rotate: sparkleRotate }] }]}>
            <Sparkles size={24} color="#FFD700" />
          </Animated.View>

          {/* Coin Icon */}
          <View style={styles.coinContainer}>
            <Coins size={40} color="#FFD700" fill="#FFD700" />
          </View>

          {/* Text */}
          <Text style={styles.bonusText}>+1 Gold</Text>
          <Text style={styles.harmonyText}>Harmony Bonus!</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sparkleLeft: {
    position: 'absolute',
    left: -10,
    top: -10,
  },
  sparkleRight: {
    position: 'absolute',
    right: -10,
    top: -10,
  },
  coinContainer: {
    marginBottom: 12,
  },
  bonusText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 4,
  },
  harmonyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
});
