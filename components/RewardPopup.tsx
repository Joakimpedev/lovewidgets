/**
 * Reward Popup Component
 * Shows rewards after completing activities (widget updates, question answers)
 */

import { hasAsset, UIAssets } from '@/constants/Assets';
import { Colors } from '@/constants/Colors';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    Modal,
    Platform,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RewardPopupProps {
  visible: boolean;
  message: string; // e.g., "Sent!" or "Done!"
  waterReward?: number; // Water drops to show (default: 0)
  coinReward?: number; // Coins to show (default: 0)
  coinRewardConditional?: boolean; // If true, show "if partner also answers" text
  partnerName?: string; // Partner name for conditional text
  onClose: () => void;
}

export function RewardPopup({
  visible,
  message,
  waterReward = 0,
  coinReward = 0,
  coinRewardConditional = false,
  partnerName,
  onClose,
}: RewardPopupProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      // Entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-close after 2 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClose();
        });
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, onClose]);

  if (!visible) return null;

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
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.rewardsContainer}>
            {waterReward > 0 && (
              <View style={styles.rewardItem}>
                {hasAsset(UIAssets.waterDroplet) ? (
                  <Image
                    source={UIAssets.waterDroplet}
                    style={styles.rewardIcon}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.rewardEmoji}>💧</Text>
                )}
                <Text style={styles.rewardText}>+{waterReward}</Text>
              </View>
            )}
            
            {coinReward > 0 && (
              <View style={styles.rewardItem}>
                {hasAsset(UIAssets.coin) ? (
                  <Image
                    source={UIAssets.coin}
                    style={styles.rewardIcon}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.rewardEmoji}>🪙</Text>
                )}
                <Text style={styles.rewardText}>+{coinReward}</Text>
                {coinRewardConditional && (
                  <Text style={styles.conditionalText}>
                    {partnerName ? `(if ${partnerName} also answers)` : '(if partner also answers)'}
                  </Text>
                )}
              </View>
            )}
          </View>
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
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
    maxWidth: SCREEN_WIDTH - 80,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  message: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  rewardsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardIcon: {
    width: 24,
    height: 24,
  },
  rewardEmoji: {
    fontSize: 24,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.tint,
  },
  conditionalText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginLeft: 4,
  },
});

export default RewardPopup;

