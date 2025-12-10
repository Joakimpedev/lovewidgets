/**
 * Send Love Menu - Hub for affection actions
 * 
 * Navigates from Home → Here
 * Contains: Send Affection (navigates to page), Letter, Gift
 */

import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingCoachMark } from '@/components/OnboardingCoachMark';
import { AffectionAssets, hasAsset, UIAssets } from '@/constants/Assets';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { subscribeToUserProfile } from '@/utils/pairing';
import { getTodayDateString, getTodaysQuestion, getUserAnswer } from '@/utils/questionOfTheDay';
import { isFirstWidgetUpdateToday } from '@/utils/rewards';
import { getOnboardingState } from '@/utils/storage';
import { useEffect, useState } from 'react';

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  colors: any;
  accentColor: string;
  showWaterReward?: boolean;
  showQuestionRewards?: { water: boolean; gold: number };
}

function ActionCard({ 
  title, 
  description, 
  icon, 
  onPress, 
  colors, 
  accentColor, 
  isLast,
  showWaterReward,
  showQuestionRewards,
}: ActionCardProps & { isLast?: boolean }) {
  return (
    <TouchableOpacity
      style={[
        styles.actionCard, 
        { backgroundColor: colors.cardBackground, borderColor: accentColor },
        isLast && styles.lastCard
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.actionIconContainer, { backgroundColor: `${accentColor}20` }]}>
        {icon}
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={[styles.actionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      
      {/* Reward Indicators - Top Right */}
      <View style={styles.rewardContainer}>
        {showWaterReward && (
          <View style={styles.rewardBadge}>
            {hasAsset(UIAssets.waterDroplet) ? (
              <Image source={UIAssets.waterDroplet} style={styles.rewardIcon} resizeMode="contain" />
            ) : (
              <View style={[styles.rewardIcon, { backgroundColor: '#4A90E2', borderRadius: 6 }]} />
            )}
            <Text style={styles.rewardText}>+1</Text>
          </View>
        )}
        
        {showQuestionRewards && (
          <>
            {showQuestionRewards.water && (
              <View style={styles.rewardBadge}>
                {hasAsset(UIAssets.waterDroplet) ? (
                  <Image source={UIAssets.waterDroplet} style={styles.rewardIcon} resizeMode="contain" />
                ) : (
                  <View style={[styles.rewardIcon, { backgroundColor: '#4A90E2', borderRadius: 6 }]} />
                )}
                <Text style={styles.rewardText}>+1</Text>
              </View>
            )}
            {showQuestionRewards.gold > 0 && (
              <View style={styles.rewardBadge}>
                {hasAsset(UIAssets.coin) ? (
                  <Image source={UIAssets.coin} style={styles.rewardIcon} resizeMode="contain" />
                ) : (
                  <View style={[styles.rewardIcon, { backgroundColor: '#FFD700', borderRadius: 6 }]} />
                )}
                <Text style={styles.rewardText}>+{showQuestionRewards.gold}</Text>
              </View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SendLoveMenuScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const [showHubCoachMark, setShowHubCoachMark] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [onboardingState, setOnboardingState] = useState<any>(null);
  const [canEarnWidgetReward, setCanEarnWidgetReward] = useState(false);
  const [canEarnQuestionReward, setCanEarnQuestionReward] = useState<{ water: boolean; gold: number } | null>(null);

  // Load onboarding state and check rewards immediately
  useEffect(() => {
    if (!user) return;
    
    // Check widget reward immediately (doesn't need profile)
    isFirstWidgetUpdateToday(user.uid).then(setCanEarnWidgetReward);
    
    // Load onboarding state
    getOnboardingState().then(setOnboardingState);
    
    // Subscribe to profile and check question reward when profile loads
    const unsubscribe = subscribeToUserProfile(user.uid, async (profile) => {
      setUserProfile(profile);
      
      // Check question reward immediately when profile is available
      if (profile?.partnerId) {
        const today = getTodayDateString();
        const [myAnswer, question] = await Promise.all([
          getUserAnswer(user.uid, today),
          getTodaysQuestion(),
        ]);
        
        if (!myAnswer) {
          setCanEarnQuestionReward({
            water: true,
            gold: question.levelInfo.reward,
          });
        } else {
          setCanEarnQuestionReward(null);
        }
      } else {
        setCanEarnQuestionReward(null);
      }
    });
    
    return () => unsubscribe();
  }, [user]);

  // Show hub coach mark if in tutorial step
  useEffect(() => {
    if (onboardingState && userProfile?.partnerId) {
      const isInTutorial = onboardingState.isConnected && !onboardingState.hasCompletedTutorial;
      if (isInTutorial) {
        // Show coach mark after a short delay
        setTimeout(() => {
          setShowHubCoachMark(true);
        }, 500);
      }
    }
  }, [onboardingState, userProfile?.partnerId]);

  // Update question reward when profile changes
  useEffect(() => {
    const checkQuestionReward = async () => {
      if (!user || !userProfile?.partnerId) {
        setCanEarnQuestionReward(null);
        return;
      }
      
      const today = getTodayDateString();
      const [myAnswer, question] = await Promise.all([
        getUserAnswer(user.uid, today),
        getTodaysQuestion(),
      ]);
      
      if (!myAnswer) {
        setCanEarnQuestionReward({
          water: true,
          gold: question.levelInfo.reward,
        });
      } else {
        setCanEarnQuestionReward(null);
      }
    };
    checkQuestionReward();
  }, [user, userProfile?.partnerId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Send Love</Text>
        <View style={styles.backButton} />
      </View>

      {/* Action Cards - Fill entire screen evenly */}
      <View style={styles.cardContainer}>
        <ActionCard
          title="Update Partner's Widget"
          description="Draw something for their widget"
          icon={
            hasAsset(UIAssets.inkPen) ? (
              <Image source={UIAssets.inkPen} style={styles.actionIcon} resizeMode="contain" />
            ) : (
              <View style={[styles.actionIcon, { backgroundColor: colors.tint, borderRadius: 16 }]} />
            )
          }
          onPress={() => {
            if (showHubCoachMark) {
              setShowHubCoachMark(false);
            }
            router.push('/canvas?onboarding=true');
          }}
          colors={colors}
          accentColor={colors.tint}
          showWaterReward={canEarnWidgetReward}
        />

        <ActionCard
          title="Question of the Day"
          description="Learn more about each other"
          icon={
            hasAsset(AffectionAssets.gift) ? (
              <Image source={AffectionAssets.gift} style={styles.actionIcon} resizeMode="contain" />
            ) : (
              <View style={[styles.actionIcon, { backgroundColor: '#FF6B9D', borderRadius: 16 }]} />
            )
          }
          onPress={() => {
            if (showHubCoachMark) {
              setShowHubCoachMark(false);
            }
            router.push('/question-of-the-day?onboarding=true');
          }}
          colors={colors}
          accentColor="#FF6B9D"
          showQuestionRewards={canEarnQuestionReward || undefined}
        />

        <ActionCard
          title="Send Affection"
          description="Kiss, hug, wave, and more"
          icon={
            hasAsset(UIAssets.heart) ? (
              <Image source={UIAssets.heart} style={styles.actionIcon} resizeMode="contain" />
            ) : (
              <View style={[styles.actionIcon, { backgroundColor: colors.secondaryTint, borderRadius: 16 }]} />
            )
          }
          onPress={() => router.push('/affection-select')}
          colors={colors}
          accentColor={colors.secondaryTint}
        />

        <ActionCard
          title="Shared Doodle"
          description="Draw together in real-time"
          icon={
            hasAsset(UIAssets.doodle) ? (
              <Image source={UIAssets.doodle} style={styles.actionIcon} resizeMode="contain" />
            ) : (
              <View style={[styles.actionIcon, { backgroundColor: '#2ECC71', borderRadius: 16 }]} />
            )
          }
          onPress={() => {
            if (showHubCoachMark) {
              setShowHubCoachMark(false);
            }
            router.push('/shared-doodle');
          }}
          colors={colors}
          accentColor="#2ECC71"
          isLast={true}
        />
      </View>

      {/* Hub Coach Mark for Tutorial */}
      <OnboardingCoachMark
        visible={showHubCoachMark}
        message={`Update ${userProfile?.partnerName || '[Partner Name]'}'s widget or answer the Question of the Day to earn your first Water Bucket.`}
        position="center"
        showDismissButton={true}
        onDismiss={async () => {
          setShowHubCoachMark(false);
          // Mark tutorial as completed
          const { setOnboardingState } = await import('@/utils/storage');
          await setOnboardingState({ hasCompletedTutorial: true });
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
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 55, // Small spacing at bottom
  },
  actionCard: {
    flex: 1, // Each card takes equal space (1/4 of available height)
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 16,
    marginBottom: 12,
    position: 'relative', // For absolute positioned reward indicators
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
  lastCard: {
    marginBottom: 0, // Last card has no bottom margin to reach bottom
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    width: 36,
    height: 36,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  rewardContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'flex-end',
    gap: 6,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  rewardIcon: {
    width: 16,
    height: 16,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D2A2B',
  },
});
