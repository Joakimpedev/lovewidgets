/**
 * Level Up Modal
 * 
 * Shown when user reaches a new garden level.
 * Allows choosing which flower to plant.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Sparkles, Lock } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { hasAsset, UIAssets } from '@/constants/Assets';
import {
  FlowerSeed,
  FlowerTypeId,
  FLOWER_MARKET,
  getAvailableFlowers,
} from '@/constants/FlowerMarket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LevelUpModalProps {
  visible: boolean;
  newLevel: number;
  userCoins: number;
  unlockedFlowers: FlowerTypeId[];
  onSelectFlower: (flowerId: FlowerTypeId) => void;
  onClose: () => void;
}

export function LevelUpModal({
  visible,
  newLevel,
  userCoins,
  unlockedFlowers,
  onSelectFlower,
  onClose,
}: LevelUpModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

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
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const handleSelect = (flower: FlowerSeed) => {
    const canAfford = flower.price === 0 || userCoins >= flower.price;
    const isUnlocked = flower.unlocked || unlockedFlowers.includes(flower.id);

    if (canAfford || isUnlocked) {
      onSelectFlower(flower.id);
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
            <Text style={styles.levelUpText}>Level Up!</Text>
            <Animated.View style={{ transform: [{ rotate: sparkleRotate }] }}>
              <Sparkles size={28} color={Colors.light.streakFire} />
            </Animated.View>
          </View>

          <Text style={styles.newLevelText}>🌷 Level {newLevel}</Text>
          <Text style={styles.subtitle}>Choose a flower to plant</Text>

          {/* Flower selection grid */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.flowerGrid}
            showsVerticalScrollIndicator={false}
          >
            {FLOWER_MARKET.map((flower) => {
              const isUnlocked = flower.unlocked || unlockedFlowers.includes(flower.id);
              const canAfford = flower.price === 0 || userCoins >= flower.price;
              const isAvailable = isUnlocked || canAfford;

              return (
                <TouchableOpacity
                  key={flower.id}
                  style={[
                    styles.flowerCard,
                    !isAvailable && styles.flowerCardLocked,
                    isUnlocked && styles.flowerCardUnlocked,
                  ]}
                  onPress={() => handleSelect(flower)}
                  disabled={!isAvailable}
                  activeOpacity={0.8}
                >
                  {/* Lock overlay for unavailable */}
                  {!isAvailable && (
                    <View style={styles.lockOverlay}>
                      <Lock size={24} color={Colors.light.textSecondary} />
                    </View>
                  )}

                  {/* Flower emoji */}
                  <Text style={styles.flowerEmoji}>{flower.emoji}</Text>

                  {/* Name */}
                  <Text style={styles.flowerName}>{flower.name}</Text>

                  {/* Price or FREE badge */}
                  {flower.price === 0 ? (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeText}>FREE</Text>
                    </View>
                  ) : (
                    <View style={styles.priceBadge}>
                      {hasAsset(UIAssets.coin) ? (
                        <Image source={UIAssets.coin} style={styles.coinIconSmall} resizeMode="contain" />
                      ) : (
                        <View style={[styles.coinIconSmall, { backgroundColor: Colors.light.streakFire, borderRadius: 6 }]} />
                      )}
                      <Text style={styles.priceText}>{flower.price}</Text>
                    </View>
                  )}

                  {/* Rarity indicator */}
                  {flower.rarity === 'rare' && (
                    <View style={styles.rarityBadge}>
                      <Text style={styles.rarityText}>✨ Rare</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Coins display */}
          <View style={styles.coinsDisplay}>
            {hasAsset(UIAssets.coin) ? (
              <Image source={UIAssets.coin} style={styles.coinIcon} resizeMode="contain" />
            ) : (
              <View style={[styles.coinIcon, { backgroundColor: Colors.light.streakFire, borderRadius: 8 }]} />
            )}
            <Text style={styles.coinsText}>{userCoins} coins</Text>
          </View>

          {/* Close button (skip) */}
          <TouchableOpacity style={styles.skipButton} onPress={onClose}>
            <Text style={styles.skipText}>Maybe later</Text>
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
    padding: 24,
    width: SCREEN_WIDTH - 48,
    maxHeight: '80%',
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
    marginBottom: 8,
  },
  levelUpText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  newLevelText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.tint,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: 20,
  },
  scrollView: {
    width: '100%',
    maxHeight: 280,
  },
  flowerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  flowerCard: {
    width: (SCREEN_WIDTH - 48 - 48 - 24) / 2, // 2 columns
    backgroundColor: Colors.light.highlight,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  flowerCardUnlocked: {
    borderColor: Colors.light.tint,
  },
  flowerCardLocked: {
    opacity: 0.5,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  flowerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  flowerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  freeBadge: {
    backgroundColor: Colors.light.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  freeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 209, 128, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  coinIconSmall: {
    width: 12,
    height: 12,
  },
  coinIcon: {
    width: 16,
    height: 16,
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  rarityText: {
    fontSize: 10,
    color: Colors.light.secondaryTint,
  },
  coinsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.light.highlight,
    borderRadius: 12,
  },
  coinsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});

export default LevelUpModal;

