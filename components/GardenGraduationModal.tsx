/**
 * Garden Graduation Modal (Step 5)
 * 
 * Shown 3 seconds after Step 4 (First Plant Tip) appears.
 * This is the final onboarding step that marks tutorial completion.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GardenGraduationModalProps {
  visible: boolean;
  onComplete: () => void;
}

export function GardenGraduationModal({
  visible,
  onComplete,
}: GardenGraduationModalProps) {
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

  const sparkleRotate = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onComplete}
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
              <Text style={styles.title}>Garden Established! 🏡</Text>
            </Animated.View>
            <Animated.View style={{ transform: [{ rotate: sparkleRotate }] }}>
              <Sparkles size={28} color={Colors.light.streakFire} />
            </Animated.View>
          </View>

          {/* Body text */}
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <Text style={styles.bodyText}>
              You've mastered the basics. Now, make this space your own.
            </Text>

            {/* List */}
            <View style={styles.listContainer}>
              <Text style={styles.listTitle}>Save your coins for:</Text>
              
              <View style={styles.listItem}>
                <Text style={styles.listEmoji}>🧸</Text>
                <Text style={styles.listText}>
                  <Text style={styles.listBold}>Decor:</Text> Furniture & cute items
                </Text>
              </View>

              <View style={styles.listItem}>
                <Text style={styles.listEmoji}>🗽</Text>
                <Text style={styles.listText}>
                  <Text style={styles.listBold}>Landmarks:</Text> Big achievements
                </Text>
              </View>

              <View style={styles.listItem}>
                <Text style={styles.listEmoji}>🎨</Text>
                <Text style={styles.listText}>
                  <Text style={styles.listBold}>Themes:</Text> Change the whole vibe
                </Text>
              </View>
            </View>

            {/* Closing text */}
            <Text style={styles.closingText}>
              The garden is yours. Have fun!
            </Text>
          </Animated.View>

          {/* Action button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Let's Grow</Text>
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
  content: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  bodyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    width: '100%',
  },
  listContainer: {
    width: '100%',
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  listEmoji: {
    fontSize: 20,
  },
  listText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  listBold: {
    fontWeight: '700',
    color: Colors.light.text,
  },
  closingText: {
    fontSize: 15,
    color: Colors.light.text,
    textAlign: 'center',
    fontWeight: '500',
    width: '100%',
    fontStyle: 'italic',
  },
  actionButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 140,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default GardenGraduationModal;

