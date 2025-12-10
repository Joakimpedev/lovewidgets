/**
 * Starter Budget Modal
 * Shows after first reward, explaining how to earn more resources
 */

import React from 'react';
import { Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { hasAsset, UIAssets } from '@/constants/Assets';
import { Colors } from '@/constants/Colors';

interface StarterBudgetModalProps {
  visible: boolean;
  coinsAwarded: number;
  onGoToShop: () => void;
  onClose: () => void;
}

export function StarterBudgetModal({
  visible,
  coinsAwarded,
  onGoToShop,
  onClose,
}: StarterBudgetModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>You received: </Text>
            {hasAsset(UIAssets.coin) ? (
              <Image source={UIAssets.coin} style={styles.coinIcon} resizeMode="contain" />
            ) : (
              <View style={[styles.coinIcon, { backgroundColor: Colors.light.streakFire, borderRadius: 8 }]} />
            )}
            <Text style={styles.title}> {coinsAwarded} Coins!</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How to earn more:</Text>
            
            <View style={styles.tipRow}>
              <Text style={styles.tipEmoji}>❓</Text>
              <Text style={styles.tipText}>Answer Daily Questions (1-3 coins)</Text>
            </View>
            
            <View style={styles.tipRow}>
              <Text style={styles.tipEmoji}>🤝</Text>
              <Text style={styles.tipText}>Maintain 3-Day Watering Streaks</Text>
            </View>
            
            <View style={styles.tipRow}>
              <Text style={styles.tipEmoji}>💧</Text>
              <Text style={styles.tipText}>Bonus: Water Together on the same day</Text>
            </View>
          </View>
          
          <Text style={styles.footerText}>Go to the Store to build your shared garden.</Text>
          
          <TouchableOpacity style={styles.shopButton} onPress={onGoToShop} activeOpacity={0.8}>
            <Text style={styles.shopButtonText}>Go to Shop</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
  },
  coinIcon: {
    width: 24,
    height: 24,
    marginHorizontal: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  tipEmoji: {
    fontSize: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  footerText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  shopButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

