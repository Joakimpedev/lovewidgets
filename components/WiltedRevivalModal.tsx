/**
 * Wilted Revival Modal
 * 
 * Shown when user tries to water a wilted garden (24+ hours).
 * User must pay 10 coins to revive the garden.
 */

import { hasAsset, UIAssets } from '@/constants/Assets';
import { Colors } from '@/constants/Colors';
import { AlertCircle } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WiltedRevivalModalProps {
  visible: boolean;
  userCoins: number;
  onRevive: () => Promise<void>;
  onClose: () => void;
}

export function WiltedRevivalModal({
  visible,
  userCoins,
  onRevive,
  onClose,
}: WiltedRevivalModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isReviving, setIsReviving] = useState(false);

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();

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
      setIsReviving(false);
    }
  }, [visible]);

  const handleRevive = async () => {
    if (userCoins < 10) {
      // This shouldn't happen if UI checks properly, but just in case
      return;
    }

    setIsReviving(true);
    try {
      await onRevive();
      // Modal will close via parent component after successful revival
    } catch (error) {
      console.error('[WiltedRevivalModal] Error reviving:', error);
      setIsReviving(false);
      // Error handling is done in parent component
    }
  };

  const canAfford = userCoins >= 10;

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
          {/* Warning Icon */}
          <Animated.View style={[styles.iconContainer, { opacity: fadeAnim }]}>
            <AlertCircle size={48} color={Colors.light.error} />
          </Animated.View>

          {/* Title */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.title}>Garden is Wilted!</Text>
          </Animated.View>

          {/* Description */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.description}>
              Your garden has been wilted for over 24 hours. You cannot water it normally.
            </Text>
            <Text style={styles.description}>
              When the garden is wilted, you will slowly start to lose your plants.
            </Text>
            <Text style={styles.description}>
              Pay 10 coins to revive your garden and bring it back to life.
            </Text>
          </Animated.View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              activeOpacity={0.8}
              disabled={isReviving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.reviveButton,
                !canAfford && styles.reviveButtonDisabled,
              ]}
              onPress={handleRevive}
              activeOpacity={0.8}
              disabled={!canAfford || isReviving}
            >
              {isReviving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.reviveButtonText}>Revive for 10</Text>
                  {hasAsset(UIAssets.coin) ? (
                    <Image source={UIAssets.coin} style={styles.reviveButtonCoinIcon} resizeMode="contain" />
                  ) : (
                    <View style={[styles.reviveButtonCoinIcon, { backgroundColor: Colors.light.streakFire, borderRadius: 8 }]} />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>

          {!canAfford && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.insufficientCoinsText}>
                You need {10 - userCoins} more coins to revive
              </Text>
            </Animated.View>
          )}
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
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  reviveButtonCoinIcon: {
    width: 18,
    height: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: Colors.light.border,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  reviveButton: {
    backgroundColor: Colors.light.tint,
  },
  reviveButtonDisabled: {
    backgroundColor: Colors.light.border,
    opacity: 0.5,
  },
  reviveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  insufficientCoinsText: {
    fontSize: 13,
    color: Colors.light.error,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
});

export default WiltedRevivalModal;

