/**
 * Affection Modal - Popup for sending different types of affection
 * Shows free and premium options with locks for premium
 */

import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Lock, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AffectionType = 
  | 'kiss' 
  | 'hug' 
  | 'wave' 
  | 'celebration' 
  | 'tickle' 
  | 'noseboop' 
  | 'cuddle' 
  | 'pat';

interface AffectionOption {
  id: AffectionType;
  emoji: string;
  name: string;
  isPremium: boolean;
}

const AFFECTION_OPTIONS: AffectionOption[] = [
  // Free options
  { id: 'kiss', emoji: '😘', name: 'Kiss', isPremium: false },
  { id: 'hug', emoji: '🤗', name: 'Hug', isPremium: false },
  { id: 'wave', emoji: '👋', name: 'Wave', isPremium: false },
  // Premium options
  { id: 'celebration', emoji: '🎉', name: 'Celebration', isPremium: true },
  { id: 'tickle', emoji: '😄', name: 'Tickle', isPremium: true },
  { id: 'noseboop', emoji: '👆', name: 'Nose Boop', isPremium: true },
  { id: 'cuddle', emoji: '🥰', name: 'Cuddle', isPremium: true },
  { id: 'pat', emoji: '👏', name: 'Pat on Back', isPremium: true },
];

interface AffectionModalProps {
  visible: boolean;
  isPremium: boolean;
  onSelect: (affectionType: AffectionType) => void;
  onClose: () => void;
}

export function AffectionModal({ visible, isPremium, onSelect, onClose }: AffectionModalProps) {
  const colorScheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];

  function handleSelect(option: AffectionOption) {
    if (option.isPremium && !isPremium) {
      // Show premium prompt (for now just console log)
      console.log('🔒 Premium feature - upgrade to unlock!');
      return;
    }
    onSelect(option.id);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Send Affection</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.optionsList}
            showsVerticalScrollIndicator={false}
          >
            {AFFECTION_OPTIONS.map((option) => {
              const isLocked = option.isPremium && !isPremium;
              
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.affectionOption,
                    { 
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                    isLocked && styles.affectionOptionLocked,
                  ]}
                  onPress={() => handleSelect(option)}
                  activeOpacity={isLocked ? 1 : 0.7}
                  disabled={isLocked}
                >
                  <View style={styles.affectionContent}>
                    <Text style={styles.affectionEmoji}>{option.emoji}</Text>
                    <Text style={[styles.affectionName, { color: colors.text }]}>
                      {option.name}
                    </Text>
                  </View>
                  
                  {isLocked && (
                    <View style={[styles.lockBadge, { backgroundColor: colors.streakFire }]}>
                      <Lock size={14} color="#FFFFFF" />
                      <Text style={styles.lockText}>Premium</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {!isPremium && (
            <View style={[styles.premiumPrompt, { backgroundColor: colors.highlight }]}>
              <Sparkles size={16} color={colors.tint} />
              <Text style={[styles.premiumPromptText, { color: colors.tint }]}>
                Unlock all affections with Premium
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  optionsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  affectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  affectionOptionLocked: {
    opacity: 0.6,
  },
  affectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  affectionEmoji: {
    fontSize: 32,
  },
  affectionName: {
    fontSize: 17,
    fontWeight: '600',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  lockText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  premiumPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  premiumPromptText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

