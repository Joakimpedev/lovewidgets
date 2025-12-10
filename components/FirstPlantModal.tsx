/**
 * First Plant Modal
 * 
 * Shown when user plants their first item of each category:
 * - Tier 1: Small Flower (30 minutes)
 * - Tier 2: Large Plant/Vine (6 hours)
 * - Tier 3: Tree (12 hours)
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { getFlowerAsset, hasAsset } from '@/constants/Assets';
import { FlowerTypeId, getFlowerInfo } from '@/constants/FlowerMarket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FirstPlantModalProps {
  visible: boolean;
  plantCategory: 'flower' | 'largeplant' | 'tree';
  flowerType: FlowerTypeId;
  onClose: () => void;
}

export function FirstPlantModal({
  visible,
  plantCategory,
  flowerType,
  onClose,
}: FirstPlantModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();

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

      // Fade in for content
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const flowerInfo = getFlowerInfo(flowerType);
  const flowerAsset = getFlowerAsset(flowerType, 'v1', 'fresh');

  // Get title and description based on category
  const getTitle = () => {
    if (plantCategory === 'flower') {
      return "You planted your first flower!";
    } else if (plantCategory === 'largeplant') {
      return "You planted your first large plant!";
    } else {
      return "You planted your first tree!";
    }
  };

  const getDescription = () => {
    if (plantCategory === 'flower') {
      return "Flowers grow quick, it should not take too long for it to blossom";
    } else if (plantCategory === 'largeplant') {
      return "It should be mature in a few hours";
    } else {
      return "It should be ready by tomorrow";
    }
  };

  const sparkleRotate = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Header with sparkles */}
          <View style={styles.header}>
            <Animated.View style={{ transform: [{ rotate: sparkleRotate }] }}>
              <Sparkles size={28} color={Colors.light.streakFire} />
            </Animated.View>
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.title}>{getTitle()}</Text>
            </Animated.View>
            <Animated.View style={{ transform: [{ rotate: sparkleRotate }] }}>
              <Sparkles size={28} color={Colors.light.streakFire} />
            </Animated.View>
          </View>

          {/* Plant image */}
          <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
            {hasAsset(flowerAsset) ? (
              <Image
                source={flowerAsset}
                style={styles.plantImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderEmoji}>{flowerInfo?.emoji || '🌱'}</Text>
              </View>
            )}
          </Animated.View>

          {/* Description */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.description}>{getDescription()}</Text>
          </Animated.View>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>Got it!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 24,
    padding: 32,
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  imageContainer: {
    width: 160,
    height: 160,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.highlight,
    borderRadius: 16,
  },
  placeholderEmoji: {
    fontSize: 80,
  },
  description: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  closeButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 120,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default FirstPlantModal;




