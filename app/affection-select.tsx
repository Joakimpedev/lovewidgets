/**
 * Affection Select Screen - Full page for selecting affection type
 * 
 * Navigates from Send Love Menu → Here
 * Shows free and premium affection options
 */

import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Lock, 
  Sparkles, 
  Heart, 
  HeartHandshake, 
  Hand, 
  PartyPopper, 
  Laugh, 
  Fingerprint, 
  Users, 
  ThumbsUp 
} from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { subscribeToUserProfile, UserProfile, getUserProfileFromFirestore } from '@/utils/pairing';
import { sendAffection } from '@/utils/letters';
import { waterSharedGarden } from '@/utils/gardenState';
import { PremiumUnlockModal } from '@/components/PremiumUnlockModal';
import { usePremiumModal } from '@/hooks/usePremiumModal';

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
  icon: React.ComponentType<any>;
  name: string;
  isPremium: boolean;
  iconColor?: string;
}

const AFFECTION_OPTIONS: AffectionOption[] = [
  // Free options
  { id: 'kiss', icon: Heart, name: 'Kiss', isPremium: false, iconColor: '#FF6B8A' },
  { id: 'hug', icon: HeartHandshake, name: 'Hug', isPremium: false, iconColor: '#FFB366' },
  { id: 'wave', icon: Hand, name: 'Wave', isPremium: false, iconColor: '#4A90E2' },
  // Premium options
  { id: 'celebration', icon: PartyPopper, name: 'Celebration', isPremium: true, iconColor: '#FFD700' },
  { id: 'tickle', icon: Laugh, name: 'Tickle', isPremium: true, iconColor: '#FF6B8A' },
  { id: 'noseboop', icon: Fingerprint, name: 'Nose Boop', isPremium: true, iconColor: '#9B59B6' },
  { id: 'cuddle', icon: Users, name: 'Cuddle', isPremium: true, iconColor: '#FFB366' },
  { id: 'pat', icon: ThumbsUp, name: 'Pat on Back', isPremium: true, iconColor: '#4A90E2' },
];

export default function AffectionSelectScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const premiumModal = usePremiumModal();

  // Subscribe to user profile to get premium status
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserProfile(user.uid, (profile) => {
      setUserProfile(profile);
    });

    return () => unsubscribe();
  }, [user]);

  const isPremium = userProfile?.isPremium || false;

  async function handleSelect(option: AffectionOption) {
    if (option.isPremium && !isPremium) {
      // Show premium unlock modal
      premiumModal.show();
      return;
    }
    
    if (!user) {
      console.log('No user logged in');
      return;
    }

    try {
      // Get user profile to find partner
      const profile = await getUserProfileFromFirestore(user.uid);
      
      if (!profile?.partnerId) {
        console.log('No partner connected');
        return;
      }

      // Send affection to inbox
      await sendAffection(user.uid, profile.partnerId, option.id);
      
      // Water the garden (affections also count as watering)
      await waterSharedGarden(user.uid, profile.partnerId);
      
      console.log('Affection sent:', option.id);
      
      // Navigate back after selection
      router.back();
    } catch (error) {
      console.error('Error sending affection:', error);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Send Affection</Text>
        <View style={styles.backButton} />
      </View>

      {/* Options List */}
      <ScrollView 
        style={styles.optionsList}
        contentContainerStyle={styles.optionsListContent}
        showsVerticalScrollIndicator={false}
      >
        {AFFECTION_OPTIONS.map((option) => {
          const isLocked = option.isPremium && !isPremium;
          const IconComponent = option.icon;
          const iconColor = isLocked ? colors.textSecondary : (option.iconColor || colors.tint);
          
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.affectionOption,
                { 
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
                isLocked && styles.affectionOptionLocked,
              ]}
              onPress={() => handleSelect(option)}
              activeOpacity={isLocked ? 1 : 0.7}
              disabled={isLocked}
            >
              <View style={styles.affectionContent}>
                <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                  <IconComponent size={32} color={iconColor} />
                </View>
                <Text style={[styles.affectionName, { color: colors.text }]}>
                  {option.name}
                </Text>
              </View>
              
              {isLocked && (
                <View style={[styles.lockBadge, { backgroundColor: colors.streakFire }]}>
                  <Lock size={16} color="#FFFFFF" />
                  <Text style={styles.lockText}>Premium</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!isPremium && (
        <TouchableOpacity
          style={[styles.premiumPrompt, { backgroundColor: colors.highlight }]}
          onPress={() => premiumModal.show()}
          activeOpacity={0.8}
        >
          <Sparkles size={18} color={colors.tint} />
          <Text style={[styles.premiumPromptText, { color: colors.tint }]}>
            Unlock all affections with Premium
          </Text>
        </TouchableOpacity>
      )}

      {/* Premium Unlock Modal */}
      <PremiumUnlockModal
        visible={premiumModal.isVisible}
        onClose={premiumModal.hide}
        onPurchaseComplete={() => {
          // Premium status will update automatically via subscription
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  optionsList: {
    flex: 1,
  },
  optionsListContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  affectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  affectionOptionLocked: {
    opacity: 0.6,
  },
  affectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affectionName: {
    fontSize: 18,
    fontWeight: '600',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  lockText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  premiumPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  premiumPromptText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

