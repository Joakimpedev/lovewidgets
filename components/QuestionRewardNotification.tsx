/**
 * Question Reward Notification Component
 * Shows notification when partner answers question of the day
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

interface QuestionRewardNotificationProps {
  visible: boolean;
  partnerName: string;
  rewardCoins: number;
  onClose: () => void;
}

export function QuestionRewardNotification({
  visible,
  partnerName,
  rewardCoins,
  onClose,
}: QuestionRewardNotificationProps) {
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

      // Auto-close after 3 seconds
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
      }, 3000);

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
          <Text style={styles.message}>
            {partnerName} just answered question of the day!
          </Text>
          
          <View style={styles.rewardsContainer}>
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
              <Text style={styles.rewardText}>+{rewardCoins}</Text>
            </View>
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
    fontSize: 18,
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
});

export default QuestionRewardNotification;






