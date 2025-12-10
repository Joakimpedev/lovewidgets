/**
 * Question of the Day Screen
 * Daily questions to learn more about your partner
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { getOnboardingState } from '@/utils/storage';
import { ArrowLeft, Clock, Send, Sparkles } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RewardPopup } from '@/components/RewardPopup';
import { hasAsset, UIAssets } from '@/constants/Assets';
import { QUESTION_LEVELS, QuestionLevel } from '@/constants/Questions';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { subscribeToUserProfile, UserProfile } from '@/utils/pairing';
import {
  formatQuestionDate,
  getQuestionHistory,
  markQuestionAsRevealed,
  QuestionStatus,
  submitAnswer,
  subscribeToTodaysQuestionStatus,
} from '@/utils/questionOfTheDay';
import { awardWaterForQuestion } from '@/utils/rewards';

// ============================================
// MAIN SCREEN
// ============================================

export default function QuestionOfTheDayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];
  const isOnboarding = params.onboarding === 'true';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [questionStatus, setQuestionStatus] = useState<QuestionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(params.showHistory === 'true');
  const [history, setHistory] = useState<QuestionStatus[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Subscribe to user profile
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToUserProfile(user.uid, (profileData) => {
      setProfile(profileData);
    });

    return unsubscribe;
  }, [user?.uid]);

  // Subscribe to today's question status
  useEffect(() => {
    if (!user?.uid || !profile?.partnerId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToTodaysQuestionStatus(
      user.uid,
      profile.partnerId,
      (status) => {
        setQuestionStatus(status);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid, profile?.partnerId]);

  // Load history when history view is shown
  useEffect(() => {
    if (showHistory && user?.uid && profile?.partnerId && history.length === 0) {
      loadHistory();
    }
  }, [showHistory, user?.uid, profile?.partnerId]);

  const loadHistory = async () => {
    if (!user?.uid || !profile?.partnerId) return;

    setLoadingHistory(true);
    try {
      const historyData = await getQuestionHistory(user.uid, profile.partnerId);
      setHistory(historyData);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!user?.uid) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Please log in to view questions
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile?.partnerId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Question of the Day</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Connect with a partner to see daily questions
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showHistory) {
    return (
      <HistoryView
        history={history}
        loading={loadingHistory}
        onBack={() => setShowHistory(false)}
        colors={colors}
        partnerName={profile.partnerName || 'Your Partner'}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Question of the Day</Text>
        <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.backButton}>
          <Clock size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : questionStatus ? (
        <QuestionView
          questionStatus={questionStatus}
          userId={user.uid}
          partnerId={profile.partnerId}
          partnerName={profile.partnerName || 'Your Partner'}
          colors={colors}
          router={router}
          isOnboarding={isOnboarding}
        />
      ) : (
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Unable to load question
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================
// QUESTION VIEW COMPONENT
// ============================================

interface QuestionViewProps {
  questionStatus: QuestionStatus;
  userId: string;
  partnerId: string;
  partnerName: string;
  colors: any;
  router: any;
  isOnboarding?: boolean;
}

function QuestionView({
  questionStatus,
  userId,
  partnerId,
  partnerName,
  colors,
  router,
  isOnboarding = false,
}: QuestionViewProps) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showQuestion, setShowQuestion] = useState(questionStatus.hasRevealed);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardCoins, setRewardCoins] = useState(0);
  const navigateAfterPopupRef = useRef(false);

  const handleReveal = async () => {
    if (showQuestion) return;

    try {
      await markQuestionAsRevealed(userId, questionStatus.questionId);
      setShowQuestion(true);
    } catch (error) {
      console.error('Error revealing question:', error);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim() || submitting) return;

    setSubmitting(true);
    try {
      // Check if partner already answered (to determine if coins will be awarded)
      const partnerAlreadyAnswered = questionStatus.partnerHasAnswered;
      
      await submitAnswer(userId, partnerId, questionStatus.questionId, answer.trim());
      
      // Award water for answering question
      await awardWaterForQuestion(userId);
      
      // Check if this is first reward for onboarding
      let isFirstReward = false;
      if (isOnboarding) {
        const onboardingState = await getOnboardingState();
        if (onboardingState && !onboardingState.hasReceivedStarterBudget) {
          isFirstReward = true;
        }
      }
      
      // Show reward popup with water and coins
      // Always show coins, but with conditional text if partner hasn't answered
      const coins = questionStatus.levelInfo.reward;
      setRewardCoins(coins);
      navigateAfterPopupRef.current = !isFirstReward; // Don't navigate if first reward
      setShowRewardPopup(true);
      
      if (partnerAlreadyAnswered) {
        console.log(`[Question] Both partners answered - showing ${coins} coins in reward popup`);
      } else {
        console.log(`[Question] Partner hasn't answered yet - showing conditional coin reward`);
      }
      
      // If first reward, navigate back to home with param to trigger Step 3
      if (isFirstReward) {
        // Wait for popup to show
        await new Promise(resolve => setTimeout(resolve, 2500));
        router.replace(`/(tabs)?onboardingReward=question&onboardingRewardCoins=${coins}`);
        return; // Don't continue to letters tab
      }
      
      // Navigation will happen in the popup's onClose callback
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
      setSubmitting(false);
    }
  };

  // Status screen - shows all levels and active one
  if (!showQuestion) {
    const activeLevel = questionStatus.level;
    
    return (
      <ScrollView
        contentContainerStyle={styles.statusContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusContent}>
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            Question of the Day
          </Text>

          {/* All 3 Levels */}
          <View style={styles.levelsContainer}>
            {([1, 2, 3] as QuestionLevel[]).map((level) => {
              const levelInfo = QUESTION_LEVELS[level];
              const isActive = level === activeLevel;
              
              return (
                <View
                  key={level}
                  style={[
                    styles.levelCard,
                    {
                      backgroundColor: isActive
                        ? colors.tint + '15'
                        : colors.cardBackground,
                      borderColor: isActive ? colors.tint : colors.border,
                      borderWidth: isActive ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.levelCardHeader}>
                    <Text style={styles.levelCardBadge}>{levelInfo.badge}</Text>
                    <Text style={[styles.levelCardLabel, { color: colors.text }]}>
                      Level {level}
                    </Text>
                    {isActive && (
                      <View style={[styles.activeIndicator, { backgroundColor: colors.tint }]} />
                    )}
                  </View>
                  
                  {isActive && (
                    <View style={styles.activeLevelInfo}>
                      <Text style={[styles.activeLevelTitle, { color: colors.text }]}>
                        {levelInfo.title}
                      </Text>
                      <Text style={[styles.activeLevelVibe, { color: colors.textSecondary }]}>
                        {levelInfo.vibe}
                      </Text>
                      <Text style={[styles.activeLevelEffort, { color: colors.textSecondary }]}>
                        {levelInfo.effort}
                      </Text>
                      <View style={styles.rewardContainer}>
                        <Text style={[styles.rewardLabel, { color: colors.text }]}>
                          Reward (if both answer):
                        </Text>
                        <View style={styles.rewardValue}>
                          {hasAsset(UIAssets.coin) ? (
                            <Image
                              source={UIAssets.coin}
                              style={styles.rewardCoinIcon}
                              resizeMode="contain"
                            />
                          ) : (
                            <Text style={styles.rewardCoinEmoji}>🪙</Text>
                          )}
                          <Text style={[styles.rewardAmount, { color: colors.tint }]}>
                            {levelInfo.reward}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.partnerStatusCard}>
            <Text style={[styles.partnerStatusText, { color: colors.textSecondary }]}>
              {partnerName} has {questionStatus.partnerHasAnswered ? '' : 'not '}answered today's question
            </Text>
            <View
              style={[
                styles.partnerStatusDot,
                {
                  backgroundColor: questionStatus.partnerHasAnswered
                    ? colors.tint
                    : colors.textSecondary + '40',
                },
              ]}
            />
          </View>

          <TouchableOpacity
            style={[styles.revealButton, { backgroundColor: colors.tint }]}
            onPress={handleReveal}
            activeOpacity={0.8}
          >
            <Sparkles size={20} color="#fff" />
            <Text style={styles.revealButtonText}>View Question</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Question and answer screen
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.questionContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Card */}
        <View style={[styles.questionCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.questionHeader}>
            <Text style={[styles.questionDate, { color: colors.textSecondary }]}>
              {formatQuestionDate(questionStatus.date)}
            </Text>
            {questionStatus.coinsEarned > 0 && (
              <View style={[styles.coinsBadge, { backgroundColor: colors.tint + '20' }]}>
                <View style={styles.coinsBadgeContent}>
                  <Text style={[styles.coinsText, { color: colors.tint }]}>
                    +{questionStatus.coinsEarned}
                  </Text>
                  {hasAsset(UIAssets.coin) ? (
                    <Image
                      source={UIAssets.coin}
                      style={styles.coinsBadgeIcon}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.coinsBadgeEmoji}>🪙</Text>
                  )}
                </View>
              </View>
            )}
          </View>

          <Text style={[styles.questionText, { color: colors.text }]}>
            {questionStatus.questionText}
          </Text>
        </View>

        {/* Status Indicator */}
        <View style={styles.statusIndicatorContainer}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: questionStatus.hasAnswered
                      ? colors.tint
                      : colors.textSecondary + '40',
                  },
                ]}
              />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>You</Text>
            </View>
            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: questionStatus.partnerHasAnswered
                      ? colors.tint
                      : colors.textSecondary + '40',
                  },
                ]}
              />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {partnerName}
              </Text>
            </View>
          </View>
        </View>

        {/* Answer Input */}
        {!questionStatus.hasAnswered ? (
          <View style={styles.answerSection}>
            <Text style={[styles.answerLabel, { color: colors.text }]}>Your Answer</Text>
            <TextInput
              style={[
                styles.answerInput,
                {
                  backgroundColor: colors.cardBackground,
                  color: colors.text,
                  borderColor: colors.textSecondary + '30',
                },
              ]}
              placeholder="Share your thoughts..."
              placeholderTextColor={colors.textSecondary + '80'}
              value={answer}
              onChangeText={setAnswer}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: answer.trim() ? colors.tint : colors.textSecondary + '40',
                },
              ]}
              onPress={handleSubmit}
              disabled={!answer.trim() || submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Send Answer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.answerSection}>
            <Text style={[styles.answerLabel, { color: colors.text }]}>Your Answer</Text>
            <View
              style={[
                styles.answerDisplay,
                { backgroundColor: colors.cardBackground, borderColor: colors.tint + '40' },
              ]}
            >
              <Text style={[styles.answerText, { color: colors.text }]}>
                {questionStatus.myAnswer}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Reward Popup */}
      <RewardPopup
        visible={showRewardPopup}
        message="Done!"
        waterReward={1}
        coinReward={rewardCoins}
        coinRewardConditional={!questionStatus.partnerHasAnswered}
        partnerName={partnerName}
        onClose={() => {
          setShowRewardPopup(false);
          // Navigate after popup closes if we're supposed to
          if (navigateAfterPopupRef.current) {
            navigateAfterPopupRef.current = false;
            setSubmitting(false);
            // Small delay to ensure popup is fully closed
            setTimeout(() => {
              router.push('/(tabs)/letters');
            }, 100);
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ============================================
// HISTORY VIEW COMPONENT
// ============================================

interface HistoryViewProps {
  history: QuestionStatus[];
  loading: boolean;
  onBack: () => void;
  colors: any;
  partnerName: string;
}

function HistoryView({ history, loading, onBack, colors, partnerName }: HistoryViewProps) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Question History</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            No past questions yet
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.historyContainer}
          showsVerticalScrollIndicator={false}
        >
          {history.map((item) => (
            <View key={item.questionId} style={[styles.historyCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.historyHeader}>
                <View style={styles.historyHeaderLeft}>
                  <Text style={styles.historyLevelBadge}>{item.levelInfo.badge}</Text>
                  <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                    {formatQuestionDate(item.date)}
                  </Text>
                </View>
                <View style={styles.historyHeaderRight}>
                  {item.coinsEarned > 0 && (
                    <Text style={[styles.historyCoins, { color: colors.tint }]}>
                      +{item.coinsEarned} 🪙
                    </Text>
                  )}
                  <View style={styles.historyStatus}>
                    <View
                      style={[
                        styles.historyDot,
                        {
                          backgroundColor: item.hasAnswered ? colors.tint : colors.textSecondary + '40',
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.historyDot,
                        {
                          backgroundColor: item.partnerHasAnswered
                            ? colors.tint
                            : colors.textSecondary + '40',
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>

              <Text style={[styles.historyLevelTitle, { color: colors.text }]}>
                {item.levelInfo.title}
              </Text>

              <Text style={[styles.historyQuestion, { color: colors.text }]}>
                {item.questionText}
              </Text>

              {/* User's Answer */}
              {item.hasAnswered && item.myAnswer && (
                <View style={styles.historyAnswerSection}>
                  <Text style={[styles.historyAnswerLabel, { color: colors.textSecondary }]}>
                    You:
                  </Text>
                  <Text style={[styles.historyAnswerText, { color: colors.text }]}>
                    {item.myAnswer}
                  </Text>
                </View>
              )}

              {/* Partner's Answer */}
              {item.partnerHasAnswered && item.partnerAnswer && (
                <View style={styles.historyAnswerSection}>
                  <Text style={[styles.historyAnswerLabel, { color: colors.textSecondary }]}>
                    {partnerName}:
                  </Text>
                  <Text style={[styles.historyAnswerText, { color: colors.text }]}>
                    {item.partnerAnswer}
                  </Text>
                </View>
              )}

            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  // Status Screen
  statusContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  statusContent: {
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  partnerStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'transparent',
    marginBottom: 32,
  },
  partnerStatusText: {
    fontSize: 16,
    flex: 1,
  },
  partnerStatusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statusIndicatorContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  levelsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  levelCard: {
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  levelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelCardBadge: {
    fontSize: 24,
  },
  levelCardLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeLevelInfo: {
    marginTop: 12,
    gap: 6,
  },
  activeLevelTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  activeLevelVibe: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeLevelEffort: {
    fontSize: 12,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  rewardLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  rewardValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardCoinIcon: {
    width: 24,
    height: 24,
  },
  rewardCoinEmoji: {
    fontSize: 24,
  },
  coinIcon: {
    width: 16,
    height: 16,
  },
  coinEmoji: {
    fontSize: 16,
  },
  rewardAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  revealButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  // Question View
  questionContainer: {
    padding: 16,
    gap: 16,
  },
  questionCard: {
    padding: 20,
    borderRadius: 16,
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
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  questionDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  coinsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  coinsBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinsText: {
    fontSize: 13,
    fontWeight: '700',
  },
  coinsBadgeIcon: {
    width: 14,
    height: 14,
  },
  coinsBadgeEmoji: {
    fontSize: 14,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Answer Section
  answerSection: {
    gap: 12,
  },
  answerLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  answerInput: {
    minHeight: 120,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  answerDisplay: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  answerText: {
    fontSize: 16,
    lineHeight: 24,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  waitingText: {
    fontSize: 14,
  },
  // History View
  historyContainer: {
    padding: 16,
    gap: 12,
  },
  historyCard: {
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  historyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyLevelBadge: {
    fontSize: 20,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyCoins: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyLevelTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  historyStatus: {
    flexDirection: 'row',
    gap: 6,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 22,
  },
  historyAnswerSection: {
    marginTop: 12,
    gap: 4,
  },
  historyAnswerLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyAnswerText: {
    fontSize: 15,
    lineHeight: 21,
  },
});

