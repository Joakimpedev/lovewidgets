/**
 * Question of the Day Utilities for LoveWidgets
 * Handles daily questions, answers, and history
 */

import { db } from '@/config/firebaseConfig';
import {
  getQuestionForCycleDay,
  QuestionLevel,
  QuestionLevelInfo,
} from '@/constants/Questions';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { sendQuestionNotification } from './letters';
import { getUserProfileFromFirestore } from './pairing';

// ============================================
// TYPES
// ============================================

export interface Question {
  id: string; // Date string in YYYY-MM-DD format
  text: string;
  date: string; // ISO date string (YYYY-MM-DD)
  level: QuestionLevel; // 1, 2, or 3
  levelInfo: QuestionLevelInfo; // Level metadata
  cycleDay: number; // Day in the 5-day cycle (1-5)
  pool1Index: number; // Current index in Pool 1
  pool2Index: number; // Current index in Pool 2
  pool3Index: number; // Current index in Pool 3
  createdAt: Timestamp;
}

export interface QuestionState {
  cycleDay: number; // Current day in 5-day cycle (1-5)
  pool1Index: number; // Current index in Pool 1 (Casual)
  pool2Index: number; // Current index in Pool 2 (Personal)
  pool3Index: number; // Current index in Pool 3 (Deep)
  lastActivatedDate: string; // Last date (YYYY-MM-DD) when someone revealed the question
  lastUpdated: Timestamp;
}

export interface QuestionAnswer {
  id: string;
  userId: string;
  partnerId: string;
  questionId: string; // Date string (YYYY-MM-DD)
  answer: string;
  timestamp: Timestamp;
  createdAt: Timestamp;
}

export interface QuestionStatus {
  questionId: string;
  date: string;
  questionText: string;
  level: QuestionLevel;
  levelInfo: QuestionLevelInfo;
  hasRevealed: boolean; // User has revealed the question
  hasAnswered: boolean; // User has answered
  myAnswer: string | null;
  partnerHasAnswered: boolean;
  partnerAnswer: string | null;
  canReveal: boolean; // Whether user can reveal (e.g., partner has answered)
  coinsEarned: number; // Coins earned if both answered (0 if not both answered yet)
}

// ============================================
// DATE HELPERS
// ============================================

/**
 * Get today's date string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Get date string for a specific date
 */
export function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse date string to Date object
 */
export function parseDateString(dateString: string): Date {
  return new Date(dateString + 'T00:00:00');
}

// ============================================
// QUESTION OPERATIONS
// ============================================

/**
 * Get or initialize question state (tracks cycle day and pool indices)
 */
async function getQuestionState(): Promise<QuestionState> {
  const stateRef = doc(db, 'questionState', 'global');
  const stateDoc = await getDoc(stateRef);

  if (stateDoc.exists()) {
    const data = stateDoc.data();
    return {
      cycleDay: data.cycleDay ?? 1,
      pool1Index: data.pool1Index ?? 0,
      pool2Index: data.pool2Index ?? 0,
      pool3Index: data.pool3Index ?? 0,
      lastActivatedDate: data.lastActivatedDate ?? '',
      lastUpdated: data.lastUpdated,
    };
  }

  // Initialize with cycle day 1, all pools at index 0
  const initialState: QuestionState = {
    cycleDay: 1,
    pool1Index: 0,
    pool2Index: 0,
    pool3Index: 0,
    lastActivatedDate: '',
    lastUpdated: serverTimestamp() as Timestamp,
  };

  await setDoc(stateRef, initialState);
  return initialState;
}

/**
 * Update question state
 */
async function updateQuestionState(state: Partial<QuestionState>): Promise<void> {
  const stateRef = doc(db, 'questionState', 'global');
  await setDoc(
    stateRef,
    {
      ...state,
      lastUpdated: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Check if we need to advance to the next question in the cycle
 * Advances if: last activated date was before today AND someone revealed it
 */
async function checkAndAdvanceQuestion(): Promise<QuestionState> {
  const today = getTodayDateString();
  const state = await getQuestionState();

  // If question was activated on a previous day (not today), advance cycle
  // Empty string means question was never activated, so don't advance
  if (state.lastActivatedDate && state.lastActivatedDate !== '' && state.lastActivatedDate < today) {
    const nextCycleDay = ((state.cycleDay % 5) + 1); // 1-5 cycle
    
    // Advance the appropriate pool index based on the cycle day we're moving to
    let newPool1Index = state.pool1Index;
    let newPool2Index = state.pool2Index;
    let newPool3Index = state.pool3Index;

    if (nextCycleDay === 1 || nextCycleDay === 3) {
      // Moving to Pool 1 day
      newPool1Index = (state.pool1Index + 1);
    } else if (nextCycleDay === 2 || nextCycleDay === 4) {
      // Moving to Pool 2 day
      newPool2Index = (state.pool2Index + 1);
    } else if (nextCycleDay === 5) {
      // Moving to Pool 3 day
      newPool3Index = (state.pool3Index + 1);
    }

    const newState: Partial<QuestionState> = {
      cycleDay: nextCycleDay,
      pool1Index: newPool1Index,
      pool2Index: newPool2Index,
      pool3Index: newPool3Index,
      lastActivatedDate: '', // Reset activation date for new question
    };

    await updateQuestionState(newState);
    return { ...state, ...newState };
  }

  // Keep current state (either never activated, or activated today)
  return state;
}

/**
 * Get or create today's question
 * Uses 5-day cycle logic: only advances if someone revealed the previous question
 */
export async function getTodaysQuestion(): Promise<Question> {
  const today = getTodayDateString();
  
  // Check if we need to advance (if previous question was activated)
  const state = await checkAndAdvanceQuestion();
  
  // Get question based on cycle day and pool indices
  const { text, level, levelInfo } = getQuestionForCycleDay(
    state.cycleDay,
    state.pool1Index,
    state.pool2Index,
    state.pool3Index
  );
  
  // Get the question for today's date
  const questionRef = doc(db, 'questions', today);
  const questionDoc = await getDoc(questionRef);

  if (questionDoc.exists()) {
    const data = questionDoc.data();
    // Update if cycle state changed (shouldn't happen, but just in case)
    if (
      data.cycleDay !== state.cycleDay ||
      data.pool1Index !== state.pool1Index ||
      data.pool2Index !== state.pool2Index ||
      data.pool3Index !== state.pool3Index
    ) {
      await setDoc(
        questionRef,
        {
          text,
          date: today,
          level,
          levelInfo,
          cycleDay: state.cycleDay,
          pool1Index: state.pool1Index,
          pool2Index: state.pool2Index,
          pool3Index: state.pool3Index,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
    
    return {
      id: questionDoc.id,
      text: data.text || text,
      date: data.date || today,
      level: data.level || level,
      levelInfo: data.levelInfo || levelInfo,
      cycleDay: data.cycleDay ?? state.cycleDay,
      pool1Index: data.pool1Index ?? state.pool1Index,
      pool2Index: data.pool2Index ?? state.pool2Index,
      pool3Index: data.pool3Index ?? state.pool3Index,
      createdAt: data.createdAt,
    };
  }

  // Create question for today
  const newQuestion: Omit<Question, 'id'> = {
    text,
    date: today,
    level,
    levelInfo,
    cycleDay: state.cycleDay,
    pool1Index: state.pool1Index,
    pool2Index: state.pool2Index,
    pool3Index: state.pool3Index,
    createdAt: serverTimestamp() as Timestamp,
  };

  await setDoc(questionRef, newQuestion);

  return {
    id: today,
    ...newQuestion,
    createdAt: newQuestion.createdAt,
  };
}

/**
 * Get question for a specific date
 */
export async function getQuestionForDate(dateString: string): Promise<Question | null> {
  const questionRef = doc(db, 'questions', dateString);
  const questionDoc = await getDoc(questionRef);

  if (!questionDoc.exists()) {
    return null;
  }

  const data = questionDoc.data();
  return {
    id: questionDoc.id,
    text: data.text,
    date: data.date,
    level: data.level ?? 1,
    levelInfo: data.levelInfo ?? { level: 1, badge: '🌱', title: '', vibe: '', effort: '', reward: 1 },
    cycleDay: data.cycleDay ?? 1,
    pool1Index: data.pool1Index ?? 0,
    pool2Index: data.pool2Index ?? 0,
    pool3Index: data.pool3Index ?? 0,
    createdAt: data.createdAt,
  };
}

// ============================================
// ANSWER OPERATIONS
// ============================================

/**
 * Submit an answer to today's question
 * Awards coins if both partners have answered
 */
export async function submitAnswer(
  userId: string,
  partnerId: string,
  questionId: string,
  answer: string
): Promise<string> {
  const answerData = {
    userId,
    partnerId,
    questionId,
    answer,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  // Use a composite ID to ensure one answer per user per question
  const answerId = `${userId}_${questionId}`;
  const answerRef = doc(db, 'questionAnswers', answerId);

  console.log(`[Questions] Submitting answer for user ${userId}, partner ${partnerId}, question ${questionId}`);
  await setDoc(answerRef, answerData);
  console.log(`[Questions] ✅ Answer saved for user ${userId}`);

  // Check if both partners have answered and award coins
  // Note: We just saved our answer, so we know it exists. We only need to check if partner also answered.
  try {
    const question = await getQuestionForDate(questionId);
    if (!question) {
      console.log(`[Questions] ⚠️ Question not found for ${questionId}`);
      return answerId;
    }
    
    console.log(`[Questions] Question found: level ${question.level}, reward ${question.levelInfo.reward} coins`);
    
    // We just saved our answer, so we know it exists
    // Check if partner has also answered
    console.log(`[Questions] Checking if partner ${partnerId} has answered question ${questionId}...`);
    const partnerAnswer = await getPartnerAnswer(partnerId, questionId);
    
    console.log(`[Questions] Partner answer check result:`, partnerAnswer ? 'FOUND' : 'NOT FOUND');
    if (partnerAnswer) {
      console.log(`[Questions] Partner answer details:`, {
        questionId: partnerAnswer.questionId,
        answerLength: partnerAnswer.answer?.length || 0,
      });
    }

    // If both answered (we just saved ours, partner already has theirs), award coins (only once per question)
    if (partnerAnswer) {
        const rewardCoins = question.levelInfo.reward;
        console.log(`[Questions] Both partners answered! Awarding ${rewardCoins} coins for level ${question.level} question`);
        
        // Check if coins were already awarded (using a flag in the question document)
        const questionRef = doc(db, 'questions', questionId);
        const questionDoc = await getDoc(questionRef);
        const questionData = questionDoc.exists() ? questionDoc.data() : null;
        const coinsAwarded = questionData?.coinsAwarded === true;
        
        console.log(`[Questions] Question document check:`, {
          exists: questionDoc.exists(),
          coinsAwarded: coinsAwarded,
          questionData: questionData ? {
            text: questionData.text?.substring(0, 50) + '...',
            level: questionData.level,
            coinsAwarded: questionData.coinsAwarded,
          } : null,
        });
        
        if (!coinsAwarded) {
          console.log(`[Questions] Coins not yet awarded, proceeding to award...`);
          
          // Determine who answered first and who answered second
          // We just saved our answer, so check timestamps to see who answered first
          const myAnswerDoc = await getDoc(answerRef);
          const partnerAnswerRef = doc(db, 'questionAnswers', `${partnerId}_${questionId}`);
          const partnerAnswerDoc = await getDoc(partnerAnswerRef);
          
          const myAnswerTimestamp = myAnswerDoc.exists() ? myAnswerDoc.data().timestamp : null;
          const partnerAnswerTimestamp = partnerAnswerDoc.exists() ? partnerAnswerDoc.data().timestamp : null;
          
          // Determine who answered first (lower timestamp = earlier)
          const myTime = myAnswerTimestamp?.toMillis?.() || 0;
          const partnerTime = partnerAnswerTimestamp?.toMillis?.() || 0;
          const iAnsweredFirst = myTime > 0 && partnerTime > 0 && myTime < partnerTime;
          
          console.log(`[Questions] Answer order check: myTime=${myTime}, partnerTime=${partnerTime}, iAnsweredFirst=${iAnsweredFirst}`);
          
          if (iAnsweredFirst) {
            // User A (who answered first) - DON'T award coins immediately, create pending reward
            console.log(`[Questions] User ${userId} answered first - creating pending reward (coins will be awarded when on homepage)`);
            
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.exists() ? userDoc.data() : null;
            const pendingQuestionRewards = userData?.pendingQuestionRewards || [];
            
            // Check if reward for this question is already pending
            const existingReward = pendingQuestionRewards.find((r: any) => r.questionId === questionId);
            if (!existingReward) {
              // Add pending reward for User A (who answered first)
              await updateDoc(userDocRef, {
                pendingQuestionRewards: [
                  ...pendingQuestionRewards,
                  {
                    questionId,
                    rewardCoins,
                    level: question.level,
                    timestamp: Timestamp.now(),
                  },
                ],
                updatedAt: serverTimestamp(),
              });
              
              console.log(`[Questions] 📬 Marked pending reward for user who answered first (${userId}): ${rewardCoins} coins for question ${questionId}`);
            }
          } else {
            // User B (who answered second) - award coins immediately
            console.log(`[Questions] Awarding ${rewardCoins} coins to user ${userId} (who just answered second)`);
            
            const userProfile = await getUserProfileFromFirestore(userId);
            if (!userProfile) {
              console.error(`[Questions] ❌ User profile not found for ${userId}`);
              return answerId;
            }
            
            const userWallet = userProfile.wallet || { gold: 0, water: 0, maxWater: 3 };
            const userCurrentGold = userWallet.gold || 0;
            console.log(`[Questions] User ${userId} current gold: ${userCurrentGold}, adding ${rewardCoins}`);
            
            const userDocRef = doc(db, 'users', userId);
            const newGoldAmount = userCurrentGold + rewardCoins;
            await updateDoc(userDocRef, {
              'wallet.gold': newGoldAmount,
              updatedAt: serverTimestamp(),
            });
            
            console.log(`[Questions] ✅ Awarded ${rewardCoins} coins to user who just answered (${userId})! User now has: ${newGoldAmount}`);
          }
          
          // Always create pending reward for the partner (User A who answered first)
          // This ensures they get coins when they visit homepage
          const partnerDocRef = doc(db, 'users', partnerId);
          const partnerDoc = await getDoc(partnerDocRef);
          const partnerData = partnerDoc.exists() ? partnerDoc.data() : null;
          
          const partnerPendingRewards = partnerData?.pendingQuestionRewards || [];
          
          // Check if reward for this question is already pending for partner
          const partnerExistingReward = partnerPendingRewards.find((r: any) => r.questionId === questionId);
          if (!partnerExistingReward) {
            // Add pending reward for partner (User A who answered first)
            await updateDoc(partnerDocRef, {
              pendingQuestionRewards: [
                ...partnerPendingRewards,
                {
                  questionId,
                  rewardCoins,
                  level: question.level,
                  timestamp: Timestamp.now(),
                },
              ],
              updatedAt: serverTimestamp(),
            });
            
            console.log(`[Questions] 📬 Marked pending reward for partner (${partnerId}): ${rewardCoins} coins for question ${questionId}`);
          } else {
            console.log(`[Questions] ⚠️ Reward for question ${questionId} already pending for partner`);
          }
          
          // Mark coins as awarded in question document
          await updateDoc(questionRef, {
            coinsAwarded: true,
            coinsAwardedAt: serverTimestamp(),
          }, { merge: true });
          
          console.log(`[Questions] ✅ Marked coins as awarded in question document`);
        } else {
          // coinsAwarded is true, but we need to check if coins were actually awarded
          console.log(`[Questions] ⚠️ coinsAwarded flag is true, checking if coins were actually awarded...`);
          
          // Check if partner has pending reward (means coins were awarded to first user)
          const partnerDocCheck = doc(db, 'users', partnerId);
          const partnerDocCheckSnap = await getDoc(partnerDocCheck);
          const partnerDataCheck = partnerDocCheckSnap.exists() ? partnerDocCheckSnap.data() : null;
          const partnerHasPendingReward = (partnerDataCheck?.pendingQuestionRewards || []).some((r: any) => r.questionId === questionId);
          
          if (!partnerHasPendingReward) {
            // coinsAwarded is true but partner has no pending reward
            // This means the flag was set but coins weren't actually awarded
            // Award coins now (recovery mode)
            console.log(`[Questions] ⚠️ coinsAwarded is true but partner has no pending reward - awarding coins now (recovery)`);
            
            // Award coins to the user who just answered
            const userProfileRecovery = await getUserProfileFromFirestore(userId);
            if (!userProfileRecovery) {
              console.error(`[Questions] ❌ User profile not found for ${userId} in recovery`);
            } else {
              const userWalletRecovery = userProfileRecovery.wallet || { gold: 0, water: 0, maxWater: 3 };
              const userCurrentGoldRecovery = userWalletRecovery.gold || 0;
              
              const userDocRefRecovery = doc(db, 'users', userId);
              await updateDoc(userDocRefRecovery, {
                'wallet.gold': userCurrentGoldRecovery + rewardCoins,
                updatedAt: serverTimestamp(),
              });
              
              console.log(`[Questions] ✅ Recovery: Awarded ${rewardCoins} coins to user ${userId}! User now has: ${userCurrentGoldRecovery + rewardCoins}`);
              
              // Add pending reward for partner
              const partnerDocRefRecovery = doc(db, 'users', partnerId);
              const partnerDocRecovery = await getDoc(partnerDocRefRecovery);
              const partnerDataRecovery = partnerDocRecovery.exists() ? partnerDocRecovery.data() : null;
              const pendingQuestionRewardsRecovery = partnerDataRecovery?.pendingQuestionRewards || [];
              const existingRewardRecovery = pendingQuestionRewardsRecovery.find((r: any) => r.questionId === questionId);
              
              if (!existingRewardRecovery) {
                await updateDoc(partnerDocRefRecovery, {
                  pendingQuestionRewards: [
                    ...pendingQuestionRewardsRecovery,
                    {
                      questionId,
                      rewardCoins,
                      level: question.level,
                      timestamp: Timestamp.now(),
                    },
                  ],
                  updatedAt: serverTimestamp(),
                });
                console.log(`[Questions] 📬 Recovery: Marked pending reward for partner (${partnerId}): ${rewardCoins} coins`);
              }
            }
          } else {
            console.log(`[Questions] ✅ Partner already has pending reward - coins were awarded correctly previously`);
          }
        }
      } else {
        console.log(`[Questions] Partner hasn't answered yet. Coins will be awarded when partner answers.`);
        console.log(`[Questions] Current state: User ${userId} answered, Partner ${partnerId} has NOT answered yet`);
      }
  } catch (error) {
    console.error('[Questions] ❌ Error checking/awarding coins:', error);
    console.error('[Questions] Error details:', error instanceof Error ? error.message : String(error));
    console.error('[Questions] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // Don't fail the answer submission if coin awarding fails
  }

  // Send notification to partner
  try {
    await sendQuestionNotification(userId, partnerId, questionId);
  } catch (error) {
    console.error('Error sending question notification:', error);
    // Don't fail the answer submission if notification fails
  }

  return answerId;
}

/**
 * Get user's answer for a specific question
 */
export async function getUserAnswer(
  userId: string,
  questionId: string
): Promise<QuestionAnswer | null> {
  const answerId = `${userId}_${questionId}`;
  const answerRef = doc(db, 'questionAnswers', answerId);
  const answerDoc = await getDoc(answerRef);

  if (!answerDoc.exists()) {
    return null;
  }

  const data = answerDoc.data();
  return {
    id: answerDoc.id,
    userId: data.userId,
    partnerId: data.partnerId,
    questionId: data.questionId,
    answer: data.answer,
    timestamp: data.timestamp,
    createdAt: data.createdAt,
  };
}

/**
 * Get partner's answer for a specific question
 */
export async function getPartnerAnswer(
  partnerId: string,
  questionId: string
): Promise<QuestionAnswer | null> {
  const answerId = `${partnerId}_${questionId}`;
  console.log(`[Questions] getPartnerAnswer: Looking for answer document "${answerId}"`);
  const answerRef = doc(db, 'questionAnswers', answerId);
  const answerDoc = await getDoc(answerRef);

  if (!answerDoc.exists()) {
    console.log(`[Questions] getPartnerAnswer: Answer document "${answerId}" does not exist`);
    return null;
  }

  const data = answerDoc.data();
  console.log(`[Questions] getPartnerAnswer: Found answer document "${answerId}"`, {
    userId: data.userId,
    partnerId: data.partnerId,
    questionId: data.questionId,
    hasAnswer: !!data.answer,
    answerLength: data.answer?.length || 0,
  });
  
  return {
    id: answerDoc.id,
    userId: data.userId,
    partnerId: data.partnerId,
    questionId: data.questionId,
    answer: data.answer,
    timestamp: data.timestamp,
    createdAt: data.createdAt,
  };
}

/**
 * Get question status for today
 */
export async function getTodaysQuestionStatus(
  userId: string,
  partnerId: string | null
): Promise<QuestionStatus | null> {
  if (!partnerId) {
    return null;
  }

  const today = getTodayDateString();
  const question = await getTodaysQuestion();
  
  // Check if user has revealed (stored locally or in a separate collection)
  // For now, we'll check if they've answered (which implies they've revealed)
  const myAnswer = await getUserAnswer(userId, today);
  const partnerAnswer = await getPartnerAnswer(partnerId, today);

  // Check reveal status from a separate collection
  const revealRef = doc(db, 'questionReveals', `${userId}_${today}`);
  const revealDoc = await getDoc(revealRef);
  const hasRevealed = revealDoc.exists() || !!myAnswer;

  // Check if coins were awarded (both answered)
  const questionRef = doc(db, 'questions', today);
  const questionDoc = await getDoc(questionRef);
  const questionData = questionDoc.data();
  const coinsEarned = (myAnswer && partnerAnswer && questionData?.coinsAwarded) 
    ? question.levelInfo.reward 
    : 0;

  return {
    questionId: today,
    date: today,
    questionText: question.text,
    level: question.level,
    levelInfo: question.levelInfo,
    hasRevealed,
    hasAnswered: !!myAnswer,
    myAnswer: myAnswer?.answer || null,
    partnerHasAnswered: !!partnerAnswer,
    partnerAnswer: partnerAnswer?.answer || null,
    canReveal: true, // For now, always allow reveal
    coinsEarned,
  };
}

/**
 * Mark question as revealed
 * This also marks the question as "activated" so it will advance tomorrow
 */
export async function markQuestionAsRevealed(
  userId: string,
  questionId: string
): Promise<void> {
  const today = getTodayDateString();
  const revealId = `${userId}_${questionId}`;
  const revealRef = doc(db, 'questionReveals', revealId);
  
  // Mark as revealed for this user
  await setDoc(revealRef, {
    userId,
    questionId,
    revealedAt: serverTimestamp(),
  });

  // Mark question as activated for today (so it advances tomorrow)
  const state = await getQuestionState();
  if (state.lastActivatedDate !== today) {
    await updateQuestionState({
      lastActivatedDate: today,
    });
  }
}

// ============================================
// SUBSCRIPTIONS (REAL-TIME)
// ============================================

/**
 * Subscribe to today's question status (real-time updates)
 */
export function subscribeToTodaysQuestionStatus(
  userId: string,
  partnerId: string | null,
  callback: (status: QuestionStatus | null) => void
): () => void {
  if (!partnerId) {
    callback(null);
    return () => {};
  }

  const today = getTodayDateString();
  let myAnswer: QuestionAnswer | null = null;
  let partnerAnswer: QuestionAnswer | null = null;
  let question: Question | null = null;
  let hasRevealed = false;

  // Get initial question
  getTodaysQuestion().then((q) => {
    question = q;
    updateStatus();
  });

  // Subscribe to my answer
  const myAnswerId = `${userId}_${today}`;
  const myAnswerRef = doc(db, 'questionAnswers', myAnswerId);
  const unsubMyAnswer = onSnapshot(myAnswerRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      myAnswer = {
        id: doc.id,
        userId: data.userId,
        partnerId: data.partnerId,
        questionId: data.questionId,
        answer: data.answer,
        timestamp: data.timestamp,
        createdAt: data.createdAt,
      };
    } else {
      myAnswer = null;
    }
    updateStatus();
  });

  // Subscribe to partner's answer
  const partnerAnswerId = `${partnerId}_${today}`;
  const partnerAnswerRef = doc(db, 'questionAnswers', partnerAnswerId);
  const unsubPartnerAnswer = onSnapshot(partnerAnswerRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      partnerAnswer = {
        id: doc.id,
        userId: data.userId,
        partnerId: data.partnerId,
        questionId: data.questionId,
        answer: data.answer,
        timestamp: data.timestamp,
        createdAt: data.createdAt,
      };
    } else {
      partnerAnswer = null;
    }
    updateStatus();
  });

  // Subscribe to reveal status
  const revealId = `${userId}_${today}`;
  const revealRef = doc(db, 'questionReveals', revealId);
  const unsubReveal = onSnapshot(revealRef, (doc) => {
    hasRevealed = doc.exists();
    updateStatus();
  });

  // Subscribe to question document to check coins awarded
  const questionRef = doc(db, 'questions', today);
  let coinsAwarded = false;
  const unsubQuestion = onSnapshot(questionRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      coinsAwarded = data.coinsAwarded || false;
      // Update question if it changed
      if (data.text && data.level) {
        question = {
          id: doc.id,
          text: data.text,
          date: data.date || today,
          level: data.level,
          levelInfo: data.levelInfo,
          cycleDay: data.cycleDay ?? 1,
          pool1Index: data.pool1Index ?? 0,
          pool2Index: data.pool2Index ?? 0,
          pool3Index: data.pool3Index ?? 0,
          createdAt: data.createdAt,
        };
      }
      updateStatus();
    }
  });

  function updateStatus() {
    if (!question || !partnerId) {
      callback(null);
      return;
    }

    const coinsEarned = (myAnswer && partnerAnswer && coinsAwarded) 
      ? question.levelInfo.reward 
      : 0;

    callback({
      questionId: today,
      date: today,
      questionText: question.text,
      level: question.level,
      levelInfo: question.levelInfo,
      hasRevealed,
      hasAnswered: !!myAnswer,
      myAnswer: myAnswer?.answer || null,
      partnerHasAnswered: !!partnerAnswer,
      partnerAnswer: partnerAnswer?.answer || null,
      canReveal: true,
      coinsEarned,
    });
  }

  return () => {
    unsubMyAnswer();
    unsubPartnerAnswer();
    unsubReveal();
    unsubQuestion();
  };
}

/**
 * Get history of questions (past questions with answers)
 */
export async function getQuestionHistory(
  userId: string,
  partnerId: string | null,
  limitCount: number = 30
): Promise<Array<QuestionStatus>> {
  if (!partnerId) {
    return [];
  }

  const answersRef = collection(db, 'questionAnswers');
  
  // Get my answers (no orderBy to avoid index requirement, we'll sort in memory)
  const myAnswersQuery = query(
    answersRef,
    where('userId', '==', userId)
  );
  
  const myAnswersSnapshot = await getDocs(myAnswersQuery);
  const questionIds = new Set<string>();
  const myAnswersArray: Array<{ doc: any; data: any }> = [];
  
  myAnswersSnapshot.forEach((doc) => {
    const data = doc.data();
    questionIds.add(data.questionId);
    myAnswersArray.push({ doc, data });
  });
  
  // Sort by timestamp descending in memory and limit
  myAnswersArray.sort((a, b) => {
    const timeA = a.data.timestamp?.toMillis?.() || 0;
    const timeB = b.data.timestamp?.toMillis?.() || 0;
    return timeB - timeA; // Descending order (newest first)
  });
  
  // Apply limit after sorting
  const limitedAnswers = myAnswersArray.slice(0, limitCount);
  
  // Rebuild questionIds from limited answers only
  const limitedQuestionIds = new Set<string>();
  limitedAnswers.forEach(({ data }) => {
    limitedQuestionIds.add(data.questionId);
  });

  // Get partner's answers for the same questions
  let partnerAnswersSnapshot;
  if (limitedQuestionIds.size === 0) {
    // No questions found, return empty array
    return [];
  } else if (limitedQuestionIds.size <= 10) {
    // Firestore 'in' query supports up to 10 items
    const partnerAnswersQuery = query(
      answersRef,
      where('userId', '==', partnerId),
      where('questionId', 'in', Array.from(limitedQuestionIds))
    );
    partnerAnswersSnapshot = await getDocs(partnerAnswersQuery);
  } else {
    // If more than 10, we need to batch (for now, just get first 10)
    // TODO: Implement proper batching if needed
    const questionIdsArray = Array.from(limitedQuestionIds).slice(0, 10);
    const partnerAnswersQuery = query(
      answersRef,
      where('userId', '==', partnerId),
      where('questionId', 'in', questionIdsArray)
    );
    partnerAnswersSnapshot = await getDocs(partnerAnswersQuery);
  }
  const partnerAnswersMap = new Map<string, QuestionAnswer>();
  
  partnerAnswersSnapshot.forEach((doc) => {
    const data = doc.data();
    partnerAnswersMap.set(data.questionId, {
      id: doc.id,
      userId: data.userId,
      partnerId: data.partnerId,
      questionId: data.questionId,
      answer: data.answer,
      timestamp: data.timestamp,
      createdAt: data.createdAt,
    });
  });

  // Build status array
  const history: QuestionStatus[] = [];
  
  for (const { doc, data } of limitedAnswers) {
    const questionId = data.questionId;
    
    // Get question text
    const question = await getQuestionForDate(questionId);
    if (!question) continue;

    const myAnswer: QuestionAnswer = {
      id: doc.id,
      userId: data.userId,
      partnerId: data.partnerId,
      questionId: data.questionId,
      answer: data.answer,
      timestamp: data.timestamp,
      createdAt: data.createdAt,
    };

    const partnerAnswer = partnerAnswersMap.get(questionId);

    // Only include questions where BOTH partners answered
    if (!partnerAnswer) {
      continue; // Skip this question if partner hasn't answered
    }

    // Check if coins were awarded (question already has levelInfo from getQuestionForDate)
    const coinsEarned = (partnerAnswer && question.levelInfo) 
      ? question.levelInfo.reward 
      : 0;

    history.push({
      questionId,
      date: questionId,
      questionText: question.text,
      level: question.level,
      levelInfo: question.levelInfo,
      hasRevealed: true, // Past questions are always revealed
      hasAnswered: true,
      myAnswer: myAnswer.answer,
      partnerHasAnswered: true, // We know partner answered since we filtered
      partnerAnswer: partnerAnswer.answer,
      canReveal: true,
      coinsEarned,
    });
  }

  // Sort by date descending (newest first)
  return history.sort((a, b) => {
    const dateA = parseDateString(a.date);
    const dateB = parseDateString(b.date);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Format date for display
 */
export function formatQuestionDate(dateString: string): string {
  try {
    const date = parseDateString(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateString === getTodayDateString()) {
      return 'Today';
    } else if (dateString === getDateString(yesterday)) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  } catch {
    return dateString;
  }
}

/**
 * Check for pending question rewards and return them
 * Returns array of pending rewards that should be shown to user
 */
export async function getPendingQuestionRewards(userId: string): Promise<Array<{
  questionId: string;
  rewardCoins: number;
  level: QuestionLevel;
  timestamp: Timestamp;
}>> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return [];
    }
    
    const userData = userDoc.data();
    const pendingRewards = userData.pendingQuestionRewards || [];
    
    return pendingRewards;
  } catch (error) {
    console.error('[Questions] Error getting pending rewards:', error);
    return [];
  }
}

/**
 * Process and clear pending question rewards
 * Awards coins and removes from pending list
 */
export async function processPendingQuestionRewards(
  userId: string,
  partnerName: string
): Promise<Array<{ questionId: string; rewardCoins: number; level: QuestionLevel }> | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const userData = userDoc.data();
    const pendingRewards = userData.pendingQuestionRewards || [];
    
    if (pendingRewards.length === 0) {
      return null;
    }
    
    // Get user's current wallet
    const userProfile = await getUserProfileFromFirestore(userId);
    const userWallet = userProfile?.wallet || { gold: 0, water: 0, maxWater: 3 };
    const userCurrentGold = userWallet.gold || 0;
    
    // Calculate total coins to award
    const totalCoins = pendingRewards.reduce((sum: number, reward: any) => sum + (reward.rewardCoins || 0), 0);
    
    // Award coins
    await updateDoc(userDocRef, {
      'wallet.gold': userCurrentGold + totalCoins,
      pendingQuestionRewards: [], // Clear pending rewards
      updatedAt: serverTimestamp(),
    });
    
    console.log(`[Questions] ✅ Processed ${pendingRewards.length} pending rewards, awarded ${totalCoins} coins total`);
    
    // Return rewards for display
    return pendingRewards.map((reward: any) => ({
      questionId: reward.questionId,
      rewardCoins: reward.rewardCoins,
      level: reward.level,
    }));
  } catch (error) {
    console.error('[Questions] Error processing pending rewards:', error);
    return null;
  }
}

/**
 * DEV: Reset question of the day status for today
 * Deletes reveal status and answer, but keeps the question
 * Also resets coinsAwarded flag so coins can be awarded again
 */
export async function resetTodaysQuestionStatus(userId: string): Promise<void> {
  const today = getTodayDateString();
  
  console.log(`[Questions] 🛠️ DEV: Resetting question status for ${today}`);
  
  // Delete reveal status
  const revealId = `${userId}_${today}`;
  const revealRef = doc(db, 'questionReveals', revealId);
  const revealDoc = await getDoc(revealRef);
  if (revealDoc.exists()) {
    await deleteDoc(revealRef);
    console.log(`[Questions] 🛠️ DEV: Deleted reveal status for user ${userId}`);
  }

  // Delete answer
  const answerId = `${userId}_${today}`;
  const answerRef = doc(db, 'questionAnswers', answerId);
  const answerDoc = await getDoc(answerRef);
  if (answerDoc.exists()) {
    await deleteDoc(answerRef);
    console.log(`[Questions] 🛠️ DEV: Deleted answer for user ${userId}`);
  }
  
  // Reset coinsAwarded flag in question document
  const questionRef = doc(db, 'questions', today);
  const questionDoc = await getDoc(questionRef);
  if (questionDoc.exists()) {
    await updateDoc(questionRef, {
      coinsAwarded: false,
      coinsAwardedAt: null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log(`[Questions] 🛠️ DEV: Reset coinsAwarded flag for question ${today}`);
  } else {
    console.log(`[Questions] 🛠️ DEV: Question document ${today} does not exist`);
  }
  
  // Also clear any pending rewards for this question from user's profile
  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    const userData = userDoc.data();
    const pendingRewards = userData.pendingQuestionRewards || [];
    const filteredRewards = pendingRewards.filter((r: any) => r.questionId !== today);
    
    if (filteredRewards.length !== pendingRewards.length) {
      await updateDoc(userDocRef, {
        pendingQuestionRewards: filteredRewards,
        updatedAt: serverTimestamp(),
      });
      console.log(`[Questions] 🛠️ DEV: Cleared pending rewards for question ${today} from user ${userId}`);
    }
  }
  
  console.log(`[Questions] 🛠️ DEV: Reset complete for user ${userId}`);
}

