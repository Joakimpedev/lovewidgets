/**
 * Home Screen - Scattered Icons with Garden
 * 
 * Clean, playful design with scattered action icons:
 * - Send Love → upper left area
 * - Activities → lower right area
 * 
 * Garden takes up the bottom portion of the screen
 */

import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Link2, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FirstPlantModal } from '@/components/FirstPlantModal';
import { FirstPlantTipToast } from '@/components/FirstPlantTipToast';
import { Garden } from '@/components/Garden';
import { GardenGraduationModal } from '@/components/GardenGraduationModal';
import { HarmonyBonusModal } from '@/components/HarmonyBonusModal';
import { OnboardingCoachMark } from '@/components/OnboardingCoachMark';
import { PremiumUnlockModal } from '@/components/PremiumUnlockModal';
import { QuestionRewardNotification } from '@/components/QuestionRewardNotification';
import { RewardPopup } from '@/components/RewardPopup';
import { SpotlightOverlay } from '@/components/SpotlightOverlay';
import { StarterBudgetModal } from '@/components/StarterBudgetModal';
import { StreakRewardModal } from '@/components/StreakRewardModal';
import { WiltedRevivalModal } from '@/components/WiltedRevivalModal';
import { db } from '@/config/firebaseConfig';
import { hasAsset, UIAssets } from '@/constants/Assets';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGardenStatus } from '@/hooks/useGardenStatus';
import { usePremiumModal } from '@/hooks/usePremiumModal';
import { devAddRose, devRemoveAllFlowers, devRemoveAllLandmarks, devRemoveLastFlower, reviveWiltedGarden } from '@/utils/gardenState';
import { subscribeToUserProfile, UserProfile } from '@/utils/pairing';
import { getTodayDateString, processPendingQuestionRewards } from '@/utils/questionOfTheDay';
import { getOnboardingState, setOnboardingState } from '@/utils/storage';
import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Profile photo size (24% of screen width - 60% of original 40%)
const PROFILE_PHOTO_SIZE = SCREEN_WIDTH * 0.24;

// Icon sizes
const HUB_ICON_SIZE = 80;

// Garden layout constants (matching Garden.tsx)
const FLOWER_AREA_HEIGHT = 196;
const GROUND_SURFACE_HEIGHT = 62;
const GROUND_FRONT_HEIGHT = 62;
const TOTAL_GARDEN_HEIGHT = FLOWER_AREA_HEIGHT + GROUND_SURFACE_HEIGHT + GROUND_FRONT_HEIGHT;

// ============================================
// HEADER COMPONENT
// ============================================

function HeaderStats({
  colors,
  gold,
  water,
  maxWater,
  daysConnected,
  textColor,
  textColorSecondary,
}: {
  colors: typeof Colors.light;
  gold: number;
  water: number;
  maxWater: number;
  daysConnected: number;
  textColor?: string;
  textColorSecondary?: string;
}) {
  return (
    <View style={styles.headerContainer}>
      {/* Left: Gold & Water */}
      <View style={styles.statsRow}>
        <View style={[styles.statBadge, { backgroundColor: colors.cardBackground }]}>
          {hasAsset(UIAssets.coin) ? (
            <Image source={UIAssets.coin} style={styles.statIcon} resizeMode="contain" />
          ) : (
            <View style={[styles.statIcon, { backgroundColor: '#FFD700', borderRadius: 8 }]} />
          )}
          <Text style={[styles.statText, { color: textColor || colors.text }]}>{gold}</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: colors.cardBackground }]}>
          {hasAsset(UIAssets.waterDroplet) ? (
            <Image source={UIAssets.waterDroplet} style={styles.statIcon} resizeMode="contain" />
          ) : (
            <View style={[styles.statIcon, { backgroundColor: '#4A90E2', borderRadius: 8 }]} />
          )}
          <Text style={[styles.statText, { color: textColor || colors.text }]}>{water}/{maxWater}</Text>
        </View>
      </View>

      {/* Right: Days Connected with Moon */}
      <View style={[styles.daysConnectedBadge, { backgroundColor: colors.cardBackground }]}>
        {hasAsset(UIAssets.moon) ? (
          <Image source={UIAssets.moon} style={styles.statIcon} resizeMode="contain" />
        ) : (
          <View style={[styles.statIcon, { backgroundColor: colors.tint, borderRadius: 8 }]} />
        )}
        <Text style={[styles.daysText, { color: textColor || colors.text }]}>{daysConnected}</Text>
      </View>
    </View>
  );
}

// ============================================
// COUPLE SECTION (Profile Photos with Link)
// ============================================

interface CoupleSectionProps {
  myPhotoURL: string | null | undefined;
  myDisplayName: string; // My name or nickname from partner
  partnerPhotoURL: string | null | undefined;
  partnerDisplayName: string; // Partner name or nickname I gave them
  colors: typeof Colors.light;
}

function CoupleSection({ 
  myPhotoURL, 
  myDisplayName, 
  partnerPhotoURL, 
  partnerDisplayName, 
  colors,
  textColor,
}: CoupleSectionProps & { textColor?: string }) {
  return (
    <View style={styles.coupleSection}>
      {/* My Profile */}
      <View style={styles.profileContainer}>
        <View style={[styles.profileCircle, { backgroundColor: colors.tint + '15' }]}>
          {myPhotoURL ? (
            <Image 
              source={{ uri: myPhotoURL }} 
              style={styles.profilePhoto}
              resizeMode="cover"
              onError={(error) => {
                console.log('Error loading my photo:', error);
              }}
            />
          ) : (
            <User size={PROFILE_PHOTO_SIZE * 0.4} color={colors.tint} />
          )}
        </View>
        <Text style={[styles.profileName, { color: textColor || colors.text }]} numberOfLines={1}>
          {myDisplayName}
        </Text>
      </View>

      {/* Link Icon (Chain) */}
      <View style={[styles.linkIconContainer, { backgroundColor: colors.highlight, borderColor: colors.tint + '40' }]}>
        <Link2 size={24} color={colors.tint} strokeWidth={2.5} />
      </View>

      {/* Partner Profile */}
      <View style={styles.profileContainer}>
        <View style={[styles.profileCircle, { backgroundColor: colors.tint + '15' }]}>
          {partnerPhotoURL ? (
            <Image 
              source={{ uri: partnerPhotoURL }} 
              style={styles.profilePhoto}
              resizeMode="cover"
              onError={(error) => {
                console.log('Error loading partner photo:', error);
              }}
            />
          ) : (
            <User size={PROFILE_PHOTO_SIZE * 0.4} color={colors.tint} />
          )}
        </View>
        <Text style={[styles.profileName, { color: textColor || colors.text }]} numberOfLines={1}>
          {partnerDisplayName}
        </Text>
      </View>
    </View>
  );
}

// ============================================
// SCATTERED ICON COMPONENT
// ============================================

interface ScatteredIconProps {
  asset?: any;
  filename: string;
  onPress: () => void;
  style?: object;
}

function ScatteredIcon({ asset, filename, onPress, style }: ScatteredIconProps) {
  return (
    <TouchableOpacity
      style={[styles.scatteredIcon, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {hasAsset(asset) ? (
        <Image source={asset} style={styles.iconImage} resizeMode="contain" />
      ) : (
        <View style={styles.iconPlaceholder}>
          <Text style={styles.placeholderFilename}>{filename}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const { colors: themeColors, visualTheme } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [devGrowthStage, setDevGrowthStage] = useState<'sapling' | 'mature' | null>(null);
  const [devHealth, setDevHealth] = useState<'fresh' | 'wilting' | 'wilted' | null>(null);
  
  // Planting Mode State
  const [isPlantingMode, setIsPlantingMode] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ type: string; cost: number; category?: 'flower' | 'decor' | 'landmark' } | null>(null);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  
  // Edit Landmarks Mode State
  const [isEditingLandmarks, setIsEditingLandmarks] = useState(false);

  // Garden Status Hook
  const {
    flowerCount,
    streakProgress,
    health,
    hoursSinceInteraction,
    flowers,
    landmarks,
    waterGarden,
    checkAndApplyPunishment,
    harmonyState,
    canWater,
    hasPendingHarmonyBonus,
    clearPendingHarmonyBonus,
    decor,
  } = useGardenStatus();
  
  // Harmony Bonus Modal State
  const [showHarmonyBonus, setShowHarmonyBonus] = useState(false);
  // Streak Reward Modal State
  const [showStreakReward, setShowStreakReward] = useState(false);
  // First Plant Modal State
  const [showFirstPlantModal, setShowFirstPlantModal] = useState(false);
  const [firstPlantCategory, setFirstPlantCategory] = useState<'flower' | 'largeplant' | 'tree' | null>(null);
  const [firstPlantType, setFirstPlantType] = useState<string | null>(null);
  // Wilted Revival Modal State
  const [showWiltedRevivalModal, setShowWiltedRevivalModal] = useState(false);
  const [hasDismissedWiltedModal, setHasDismissedWiltedModal] = useState(false);
  const previousHealthRef = useRef<string | null>(null);
  
  // Question Reward Notification State
  const [showQuestionRewardNotification, setShowQuestionRewardNotification] = useState(false);
  const [questionRewardCoins, setQuestionRewardCoins] = useState(0);
  const [hasCheckedPendingRewards, setHasCheckedPendingRewards] = useState(false);
  const isProcessingRewardsRef = useRef(false); // Prevent duplicate processing
  const hasAwardedStarterCoinsRef = useRef(false); // Prevent duplicate coin awards
  
  // Onboarding Flow State
  const [onboardingState, setOnboardingStateLocal] = useState<{
    isConnected: boolean;
    hasCompletedTutorial: boolean;
    hasPlantedFirstFlower: boolean;
    hasReceivedStarterBudget: boolean;
  } | null>(null);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [showTutorialCoachMark, setShowTutorialCoachMark] = useState(false);
  const [showHubCoachMark, setShowHubCoachMark] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [heartCloudPosition, setHeartCloudPosition] = useState<{ x: number; y: number } | null>(null);
  const heartCloudRef = useRef<View>(null);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardWater, setRewardWater] = useState(0);
  const [rewardCoins, setRewardCoins] = useState(0);
  const [rewardMessage, setRewardMessage] = useState('');
  const [showStarterBudgetModal, setShowStarterBudgetModal] = useState(false);
  const [showFirstPlantTip, setShowFirstPlantTip] = useState(false);
  const [showGraduationModal, setShowGraduationModal] = useState(false);
  const [isWaitingForPartner, setIsWaitingForPartner] = useState(false);
  
  // Premium Modal
  const premiumModal = usePremiumModal();
  
  // Check for pending harmony bonus notification when garden state loads
  useEffect(() => {
    if (hasPendingHarmonyBonus && !showHarmonyBonus) {
      console.log('[Home] Showing pending harmony bonus notification');
      setShowHarmonyBonus(true);
      // Clear the pending notification after showing
      clearPendingHarmonyBonus().catch(err => {
        console.error('[Home] Failed to clear pending harmony bonus:', err);
      });
    }
  }, [hasPendingHarmonyBonus, showHarmonyBonus, clearPendingHarmonyBonus]);

  // Check if garden is wilted and show revival modal automatically (only once per transition)
  useEffect(() => {
    const previousHealth = previousHealthRef.current;
    const currentHealth = health;
    
    // Detect transition from not wilted to wilted
    // This includes: initial load (previousHealth is null) and actual transitions
    if (currentHealth === 'wilted' && previousHealth !== 'wilted') {
      // Garden just became wilted (or was already wilted on initial load) - show modal if not dismissed
      if (!hasDismissedWiltedModal) {
        console.log('[Home] Garden is wilted - showing revival modal');
        setShowWiltedRevivalModal(true);
      } else {
        console.log('[Home] Garden is wilted but modal was dismissed - not showing automatically');
      }
    } else if (currentHealth !== 'wilted' && previousHealth === 'wilted') {
      // Garden is no longer wilted - close modal and reset dismissed state
      console.log('[Home] Garden is no longer wilted - closing revival modal and resetting dismissed state');
      setShowWiltedRevivalModal(false);
      setHasDismissedWiltedModal(false);
    }
    
    // Update previous health ref
    previousHealthRef.current = currentHealth;
  }, [health, hasDismissedWiltedModal]);
  
  // Check for edit landmarks mode
  useEffect(() => {
    const editLandmarks = params.editLandmarks === 'true';
    if (editLandmarks) {
      setIsEditingLandmarks(true);
      // Clear the param to prevent re-triggering
      router.setParams({ editLandmarks: undefined });
    }
  }, [params.editLandmarks, router]);
  
  // Check for pending item from shop purchase and enter planting mode
  useEffect(() => {
    console.log('[Home] Route params:', { 
      pendingItemType: params.pendingItemType, 
      pendingItemCost: params.pendingItemCost,
      hasPartner: !!userProfile?.partnerId 
    });
    
    const pendingItemType = params.pendingItemType as string | undefined;
    const pendingItemCost = params.pendingItemCost ? parseInt(params.pendingItemCost as string, 10) : undefined;
    const pendingItemCategory = params.pendingItemCategory as 'flower' | 'decor' | 'landmark' | undefined;
    
    if (pendingItemType && pendingItemCost !== undefined && userProfile?.partnerId) {
      console.log('[Home] ✅ Entering planting mode for:', pendingItemType, 'category:', pendingItemCategory || 'flower', 'cost:', pendingItemCost);
      setPendingItem({ 
        type: pendingItemType, 
        cost: pendingItemCost,
        category: pendingItemCategory || 'flower',
      });
      setIsPlantingMode(true);
      
      // Clear route params to prevent re-triggering
      router.setParams({ 
        pendingItemType: undefined, 
        pendingItemCost: undefined,
        pendingItemCategory: undefined,
      });
    } else if (pendingItemType && pendingItemCost !== undefined) {
      console.log('[Home] ⚠️ Pending item detected but missing partner. Waiting...');
    }
  }, [params.pendingItemType, params.pendingItemCost, params.pendingItemCategory, userProfile?.partnerId, router]);
  // Recently Watered Message State
  const [showRecentlyWateredMessage, setShowRecentlyWateredMessage] = useState(false);
  const recentlyWateredOpacity = useRef(new Animated.Value(0)).current;
  const recentlyWateredTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Function to show and auto-hide the recently watered message
  const showRecentlyWateredMessageWithFade = useCallback(() => {
    console.log('[Home] showRecentlyWateredMessageWithFade called');
    
    // Clear any existing timeout
    if (recentlyWateredTimeoutRef.current) {
      clearTimeout(recentlyWateredTimeoutRef.current);
    }

    // Show the message
    setShowRecentlyWateredMessage(true);
    
    // Fade in
    Animated.timing(recentlyWateredOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      console.log('[Home] Message faded in');
    });

    // Auto-hide after 3 seconds with fade out
    recentlyWateredTimeoutRef.current = setTimeout(() => {
      console.log('[Home] Auto-hiding message after 3 seconds');
      Animated.timing(recentlyWateredOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowRecentlyWateredMessage(false);
        console.log('[Home] Message hidden');
      });
    }, 3000);
  }, [recentlyWateredOpacity]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (recentlyWateredTimeoutRef.current) {
        clearTimeout(recentlyWateredTimeoutRef.current);
      }
    };
  }, []);

  // Check for pending question rewards when user profile loads or updates
  useEffect(() => {
    if (!user || !userProfile?.partnerId) return;

    // Check if there are pending rewards in the profile data
    // We need to check the profile data directly to see if there are new rewards
    // before processing them, so we can show the notification
    const checkPendingRewards = async () => {
      try {
        // Import getPendingQuestionRewards to check without processing
        const { getPendingQuestionRewards } = await import('@/utils/questionOfTheDay');
        const pendingRewards = await getPendingQuestionRewards(user.uid);
        
        if (pendingRewards && pendingRewards.length > 0) {
          // Sum up all rewards (in case there are multiple)
          const totalCoins = pendingRewards.reduce((sum, r) => sum + (r.rewardCoins || 0), 0);
          
          console.log(`[Home] Found ${pendingRewards.length} pending question reward(s) totaling ${totalCoins} coins`);
          
          // Process the rewards (award coins and clear pending list)
          const processedRewards = await processPendingQuestionRewards(
            user.uid,
            userProfile.partnerName || 'Your Partner'
          );
          
          // Show notification if processing was successful
          if (processedRewards && processedRewards.length > 0) {
            setQuestionRewardCoins(totalCoins);
            setShowQuestionRewardNotification(true);
            console.log(`[Home] ✅ Showing question reward notification: ${totalCoins} coins`);
          } else {
            console.log(`[Home] ⚠️ Processed rewards but got null/empty result`);
          }
        }
      } catch (error) {
        console.error('[Home] Error checking pending question rewards:', error);
      }
    };

    // Check for pending rewards whenever profile updates
    // The hasCheckedPendingRewards flag is reset when profile updates (see profile subscription)
    if (!hasCheckedPendingRewards) {
      checkPendingRewards();
      setHasCheckedPendingRewards(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, userProfile?.partnerId, hasCheckedPendingRewards]);

  // Subscribe to user profile and check for pending rewards in real-time
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserProfile(user.uid, async (profile) => {
      setUserProfile(profile);
      
      // Fix wallet if water or maxWater exceeds limits
      if (profile?.wallet) {
        const wallet = profile.wallet;
        const normalizedMaxWater = Math.min(wallet.maxWater, 3);
        const normalizedWater = Math.min(wallet.water, normalizedMaxWater);
        
        if (wallet.water !== normalizedWater || wallet.maxWater !== normalizedMaxWater) {
          console.log('[Home] 🔧 Fixing wallet: water', wallet.water, '->', normalizedWater, ', maxWater', wallet.maxWater, '->', normalizedMaxWater);
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            'wallet.water': normalizedWater,
            'wallet.maxWater': normalizedMaxWater,
            updatedAt: serverTimestamp(),
          });
        }
      }
      
      // Check for pending rewards immediately when profile updates
      // This ensures we catch new rewards even if user is already on homescreen
      // Note: The real-time listener will also catch this, so we skip here to avoid duplicates
      // The real-time listener is more reliable for catching new rewards
      
      // Reset pending rewards check flag when profile updates
      setHasCheckedPendingRewards(false);
      
      // Debug: Log photo URLs
      if (profile) {
        console.log('[Home] Profile updated:', {
          hasMyPhoto: !!profile.photoURL,
          hasPartnerPhoto: !!profile.partnerPhotoURL,
          myPhotoLength: profile.photoURL?.length || 0,
          partnerPhotoLength: profile.partnerPhotoURL?.length || 0,
          wallet: profile.wallet,
          garden: profile.garden,
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Load onboarding state on mount and when screen comes into focus
  const loadOnboardingState = useCallback(async () => {
    const state = await getOnboardingState();
    setOnboardingStateLocal(state);
    console.log('[Onboarding] Loaded state:', state);
  }, []);

  useEffect(() => {
    loadOnboardingState();
  }, [loadOnboardingState]);

  // Reload onboarding state when screen comes into focus (so dev reset is picked up)
  useFocusEffect(
    useCallback(() => {
      loadOnboardingState();
    }, [loadOnboardingState])
  );

  // STEP 1: Handshake - Show welcome overlay if no partner
  useEffect(() => {
    if (!onboardingState) return;
    
    const hasPartner = !!userProfile?.partnerId;
    const wasConnected = onboardingState.isConnected;
    
    // Show welcome overlay if no partner and not connected yet
    if (!hasPartner && !wasConnected) {
      setShowWelcomeOverlay(true);
      setIsWaitingForPartner(false);
    } else if (hasPartner && !wasConnected) {
      // Just connected - mark as connected
      setOnboardingState({ isConnected: true });
      setOnboardingStateLocal(prev => prev ? { ...prev, isConnected: true } : null);
      setShowWelcomeOverlay(false);
    } else if (hasPartner) {
      setShowWelcomeOverlay(false);
    }
  }, [userProfile?.partnerId, onboardingState]);

  // STEP 2: Learning Action - Show tutorial when partner connects
  useEffect(() => {
    if (!onboardingState || !userProfile?.partnerId) return;
    
    // If just connected and tutorial not completed, show tutorial
    if (onboardingState.isConnected && !onboardingState.hasCompletedTutorial) {
      // Redirect to home if not already there
      if (router.canGoBack()) {
        router.replace('/(tabs)');
      }
      
      // Show tutorial coach mark after a short delay
      setTimeout(() => {
        setShowTutorialCoachMark(true);
      }, 500);
    }
  }, [onboardingState?.isConnected, onboardingState?.hasCompletedTutorial, userProfile?.partnerId, router]);

  // Mark tutorial as completed when user taps heart cloud
  const handleTutorialHeartTap = async () => {
    if (isOnboardingStep2) {
      await setOnboardingState({ hasCompletedTutorial: true });
      setOnboardingStateLocal(prev => prev ? { ...prev, hasCompletedTutorial: true } : null);
    }
  };

  // STEP 3: Detect widget update or QotD completion for first reward
  useEffect(() => {
    if (!user || !userProfile?.partnerId || !onboardingState) return;
    if (onboardingState.hasReceivedStarterBudget) return; // Already completed
    if (!onboardingState.hasCompletedTutorial) return; // Wait for tutorial to complete
    
    // Check route params for reward completion
    const rewardType = params.onboardingReward as string | undefined;
    if (rewardType === 'widget' || rewardType === 'question') {
      // Clear the param
      router.setParams({ onboardingReward: undefined });
      
      // Show reward popup
      if (rewardType === 'widget') {
        setRewardMessage('Sent!');
        setRewardWater(1);
        setRewardCoins(0);
        setShowRewardPopup(true);
      } else if (rewardType === 'question') {
        setRewardMessage('Done!');
        setRewardWater(1);
        // Get coin amount from params if available
        const coinAmount = params.onboardingRewardCoins ? parseInt(params.onboardingRewardCoins as string, 10) : 0;
        setRewardCoins(coinAmount);
        setShowRewardPopup(true);
        router.setParams({ onboardingRewardCoins: undefined });
      }
    }
  }, [params.onboardingReward, params.onboardingRewardCoins, user, userProfile?.partnerId, onboardingState, router]);

  // Award 5 coins when StarterBudgetModal is shown (first time only)
  useEffect(() => {
    if (!showStarterBudgetModal || !user || !userProfile || !onboardingState) {
      // Reset the ref when modal is closed
      if (!showStarterBudgetModal) {
        hasAwardedStarterCoinsRef.current = false;
      }
      return;
    }
    
    // Only award if starter budget hasn't been received yet
    if (onboardingState.hasReceivedStarterBudget) {
      console.log('[Home] Starter budget already received, skipping coin award');
      hasAwardedStarterCoinsRef.current = true;
      return;
    }
    
    // Prevent duplicate awards
    if (hasAwardedStarterCoinsRef.current) {
      console.log('[Home] Already awarded starter coins for this modal session');
      return;
    }
    
    // Award 5 coins
    const awardStarterCoins = async () => {
      try {
        // Mark as awarded immediately to prevent duplicate calls
        hasAwardedStarterCoinsRef.current = true;
        
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          console.error('[Home] User document does not exist');
          hasAwardedStarterCoinsRef.current = false; // Reset on error
          return;
        }
        
        const userData = userDocSnap.data();
        const wallet = userData.wallet || { gold: 0, water: 0, maxWater: 3 };
        const currentGold = wallet.gold || 0;
        
        await updateDoc(userDocRef, {
          'wallet.gold': currentGold + 5,
          updatedAt: serverTimestamp(),
        });
        console.log('[Home] ✅ Awarded 5 starter coins! User now has:', currentGold + 5);
        
        // Refresh user profile to update coins display
        const updatedDocSnap = await getDoc(userDocRef);
        if (updatedDocSnap.exists()) {
          setUserProfile(updatedDocSnap.data() as UserProfile);
        }
      } catch (error) {
        console.error('[Home] Error awarding starter coins:', error);
        hasAwardedStarterCoinsRef.current = false; // Reset on error
      }
    };
    
    awardStarterCoins();
  }, [showStarterBudgetModal, user, onboardingState]); // Removed userProfile from dependencies to prevent loop

  // STEP 4: Detect first plant
  useEffect(() => {
    if (!onboardingState || onboardingState.hasPlantedFirstFlower) return;
    
    // Check if any flowers exist
    if (flowers && flowers.length > 0 && !onboardingState.hasPlantedFirstFlower) {
      setOnboardingState({ hasPlantedFirstFlower: true });
      setOnboardingStateLocal(prev => prev ? { ...prev, hasPlantedFirstFlower: true } : null);
      setShowFirstPlantTip(true);
    }
  }, [flowers, onboardingState?.hasPlantedFirstFlower]);

  // STEP 5: Show graduation modal 3 seconds after Step 4 appears
  useEffect(() => {
    if (!showFirstPlantTip) {
      // Reset when Step 4 is not visible
      return;
    }

    // Show graduation modal 3 seconds after Step 4 appears
    const timer = setTimeout(() => {
      setShowGraduationModal(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showFirstPlantTip]);

  // Real-time listener for pending question rewards
  // This ensures we catch new rewards immediately when they're added
  useEffect(() => {
    if (!user || !userProfile?.partnerId) return;

    console.log('[Home] Setting up real-time listener for pending question rewards');
    const userDocRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
      if (!docSnap.exists()) {
        console.log('[Home] User document does not exist in real-time listener');
        return;
      }
      
      // Prevent duplicate processing
      if (isProcessingRewardsRef.current) {
        console.log('[Home] Already processing rewards, skipping...');
        return;
      }
      
      const userData = docSnap.data();
      const pendingRewards = userData.pendingQuestionRewards || [];
      
      console.log(`[Home] Real-time listener - pendingRewards array length: ${pendingRewards.length}`);
      
      if (pendingRewards.length > 0) {
        console.log(`[Home] Real-time listener detected ${pendingRewards.length} pending reward(s):`, 
          pendingRewards.map((r: any) => ({ questionId: r.questionId, coins: r.rewardCoins })));
        
        isProcessingRewardsRef.current = true;
        try {
          // Sum up all rewards
          const totalCoins = pendingRewards.reduce((sum: number, r: any) => sum + (r.rewardCoins || 0), 0);
          console.log(`[Home] Total coins to award: ${totalCoins}`);
          
          // Process the rewards (award coins and clear pending list)
          const processedRewards = await processPendingQuestionRewards(
            user.uid,
            userProfile.partnerName || 'Your Partner'
          );
          
          console.log(`[Home] Processed rewards result:`, processedRewards);
          
          // Show notification if processing was successful
          if (processedRewards && processedRewards.length > 0) {
            const today = getTodayDateString();
            const todayProcessed = processedRewards.find((r: any) => r.questionId === today);
            if (todayProcessed && hasShownPopupForTodayRef.current !== today) {
              setQuestionRewardCoins(todayProcessed.rewardCoins);
              setShowQuestionRewardNotification(true);
              hasShownPopupForTodayRef.current = today;
              console.log(`[Home] ✅ Showing question reward notification: ${todayProcessed.rewardCoins} coins (from real-time listener)`);
            } else if (!todayProcessed || hasShownPopupForTodayRef.current === today) {
              console.log(`[Home] ⚠️ Popup already shown for today or no today's reward in processed rewards`);
            }
          } else {
            console.log(`[Home] ⚠️ No rewards to process or processing returned null/empty`);
          }
        } catch (error) {
          console.error('[Home] Error processing pending rewards from real-time listener:', error);
        } finally {
          isProcessingRewardsRef.current = false;
        }
      } else {
        console.log('[Home] No pending rewards found in real-time listener');
      }
    }, (error) => {
      console.error('[Home] Error in pending rewards real-time listener:', error);
      isProcessingRewardsRef.current = false;
    });

    return () => {
      console.log('[Home] Cleaning up real-time listener for pending question rewards');
      unsubscribe();
    };
  }, [user?.uid, userProfile?.partnerId, userProfile?.partnerName]);

  // Real-time listener for partner's answer to today's question
  // This detects when partner answers and shows popup immediately if user is on homepage
  // NOTE: Only User A (who answered first) should get the popup, not User B (who answered second)
  useEffect(() => {
    if (!user || !userProfile?.partnerId) return;

    const today = getTodayDateString();
    const partnerAnswerId = `${userProfile.partnerId}_${today}`;
    const partnerAnswerRef = doc(db, 'questionAnswers', partnerAnswerId);

    console.log('[Home] Setting up real-time listener for partner answer to today\'s question');
    
    const unsubscribe = onSnapshot(partnerAnswerRef, async (docSnap) => {
      if (!docSnap.exists()) {
        console.log('[Home] Partner has not answered today\'s question yet');
        return;
      }

      // Partner just answered (or answer exists)
      console.log('[Home] Partner answered today\'s question - checking if I should get popup');
      
      // Check if we have a pending reward for today's question
      // Only show popup if we have pending rewards (meaning we answered first)
      if (isProcessingRewardsRef.current) {
        console.log('[Home] Already processing rewards, skipping partner answer check...');
        return;
      }

      try {
        const { getPendingQuestionRewards, getUserAnswer } = await import('@/utils/questionOfTheDay');
        
        // First check if we answered (to determine if we're User A or User B)
        const myAnswer = await getUserAnswer(user.uid, today);
        if (!myAnswer) {
          console.log('[Home] I haven\'t answered yet - not showing popup');
          return;
        }
        
        // Check if we have pending rewards (only User A who answered first should have this)
        const pendingRewards = await getPendingQuestionRewards(user.uid);
        
        // Filter for today's question
        const todayReward = pendingRewards?.find((r: any) => r.questionId === today);
        
        if (todayReward) {
          // We have a pending reward, meaning we answered first (User A)
          console.log('[Home] Found pending reward for today\'s question - I answered first, processing immediately');
          
          isProcessingRewardsRef.current = true;
          
          // Process the rewards (award coins and clear pending list)
          const processedRewards = await processPendingQuestionRewards(
            user.uid,
            userProfile.partnerName || 'Your Partner'
          );
          
          // Show notification if processing was successful
          if (processedRewards && processedRewards.length > 0) {
            const todayProcessed = processedRewards.find((r: any) => r.questionId === today);
            if (todayProcessed && hasShownPopupForTodayRef.current !== today) {
              setQuestionRewardCoins(todayProcessed.rewardCoins);
              setShowQuestionRewardNotification(true);
              hasShownPopupForTodayRef.current = today;
              console.log(`[Home] ✅ Showing question reward notification: ${todayProcessed.rewardCoins} coins (partner just answered, I answered first)`);
            }
          }
          
          isProcessingRewardsRef.current = false;
        } else {
          // No pending reward - we must be User B (who answered second and got coins immediately)
          console.log('[Home] No pending reward found - I answered second, already got coins, not showing popup');
        }
      } catch (error) {
        console.error('[Home] Error checking pending rewards when partner answered:', error);
        isProcessingRewardsRef.current = false;
      }
    }, (error) => {
      console.error('[Home] Error in partner answer real-time listener:', error);
    });

    return () => {
      console.log('[Home] Cleaning up real-time listener for partner answer');
      unsubscribe();
    };
  }, [user?.uid, userProfile?.partnerId, userProfile?.partnerName]);

  // Track if we've shown the popup for today's question to avoid duplicate popups
  const hasShownPopupForTodayRef = useRef<string | null>(null);

  // Reset popup flag when day changes
  useEffect(() => {
    const today = getTodayDateString();
    if (hasShownPopupForTodayRef.current !== today) {
      hasShownPopupForTodayRef.current = null;
    }
  }, []);

  // Check for pending question rewards when screen comes into focus
  // This ensures the notification shows when user navigates back to homescreen
  useFocusEffect(
    useCallback(() => {
      if (!user || !userProfile?.partnerId) return;

      const checkPendingRewards = async () => {
        try {
          // Prevent duplicate processing
          if (isProcessingRewardsRef.current) {
            console.log('[Home] Already processing rewards on focus, skipping...');
            return;
          }

          const today = getTodayDateString();
          
          // Import functions
          const { getPendingQuestionRewards, getPartnerAnswer, getQuestionForDate } = await import('@/utils/questionOfTheDay');
          
          // Check for pending rewards first
          const pendingRewards = await getPendingQuestionRewards(user.uid);
          
          if (pendingRewards && pendingRewards.length > 0) {
            // Sum up all rewards (in case there are multiple)
            const totalCoins = pendingRewards.reduce((sum, r) => sum + (r.rewardCoins || 0), 0);
            
            console.log(`[Home] Found ${pendingRewards.length} pending question reward(s) totaling ${totalCoins} coins (screen focused)`);
            
            isProcessingRewardsRef.current = true;
            
            // Process the rewards (award coins and clear pending list)
            const processedRewards = await processPendingQuestionRewards(
              user.uid,
              userProfile.partnerName || 'Your Partner'
            );
            
            // Show notification if processing was successful
            if (processedRewards && processedRewards.length > 0) {
              // Check if today's question is in the processed rewards
              const todayProcessed = processedRewards.find((r: any) => r.questionId === today);
              if (todayProcessed && hasShownPopupForTodayRef.current !== today) {
                setQuestionRewardCoins(todayProcessed.rewardCoins);
                setShowQuestionRewardNotification(true);
                hasShownPopupForTodayRef.current = today;
                console.log(`[Home] ✅ Showing question reward notification: ${todayProcessed.rewardCoins} coins (screen focused)`);
              }
            }
            
            isProcessingRewardsRef.current = false;
          } else {
            // No pending rewards - this means either:
            // 1. We're User B (who answered second and got coins immediately) - don't show popup
            // 2. Rewards were already processed - don't show popup again
            // Only User A (who answered first) should get the popup, and they should have pending rewards
            console.log('[Home] No pending rewards found - not showing popup (either already processed or I answered second)');
          }
        } catch (error) {
          console.error('[Home] Error checking pending question rewards on focus:', error);
          isProcessingRewardsRef.current = false;
        }
      };

      // Small delay to ensure profile is loaded
      const timer = setTimeout(() => {
        checkPendingRewards();
      }, 300);

      return () => clearTimeout(timer);
    }, [user?.uid, userProfile?.partnerId, userProfile?.partnerName])
  );

  // Dev Mode: Give resources for testing (only runs once when wallet is completely empty)
  const devModeInitialized = useRef(false);
  
  useEffect(() => {
    if (!user || !userProfile || devModeInitialized.current) return;

    const wallet = userProfile.wallet;
    // ONLY initialize if wallet is completely empty (0 gold AND 0 water)
    // This prevents dev mode from resetting wallets after purchases
    // If user has ANY gold or water, don't touch it
    if (!wallet || (wallet.gold === 0 && wallet.water === 0)) {
      console.log('[Home] 🛠️ Dev Mode: Setting resources to test values (wallet was empty)');
      devModeInitialized.current = true; // Mark as initialized to prevent re-running
      const userDocRef = doc(db, 'users', user.uid);
      updateDoc(userDocRef, {
        'wallet.gold': 999,
        'wallet.water': 3,
        'wallet.maxWater': 3,
        updatedAt: serverTimestamp(),
      }).catch((error) => {
        console.error('[Home] Dev Mode error:', error);
        devModeInitialized.current = false; // Reset on error so it can retry
      });
    } else {
      // Wallet has some value, mark as initialized so we never check again
      devModeInitialized.current = true;
    }
  }, [user, userProfile]);

  // Get wallet and garden data with defaults
  const wallet = userProfile?.wallet || { gold: 0, water: 0, maxWater: 3 };
  const garden = userProfile?.garden || { streakDays: 0 };
  const gold = wallet.gold;
  // Normalize water and maxWater to cap at 3
  const normalizedMaxWater = Math.min(wallet.maxWater, 3);
  const water = Math.min(wallet.water, normalizedMaxWater);
  const maxWater = normalizedMaxWater;
  const streak = garden.streakDays;

  // Calculate days since first connection
  const calculateDaysConnected = (): number => {
    if (!userProfile?.firstConnectedAt) {
      return 0;
    }
    
    try {
      // Handle Firestore Timestamp
      let firstConnectedDate: Date;
      if (userProfile.firstConnectedAt?.toDate) {
        // Firestore Timestamp
        firstConnectedDate = userProfile.firstConnectedAt.toDate();
      } else if (userProfile.firstConnectedAt?.seconds) {
        // Firestore Timestamp object with seconds
        firstConnectedDate = new Date(userProfile.firstConnectedAt.seconds * 1000);
      } else if (typeof userProfile.firstConnectedAt === 'string') {
        // ISO string
        firstConnectedDate = new Date(userProfile.firstConnectedAt);
      } else if (typeof userProfile.firstConnectedAt === 'number') {
        // Unix timestamp
        firstConnectedDate = new Date(userProfile.firstConnectedAt);
      } else {
        return 0;
      }

      const now = new Date();
      const diffTime = now.getTime() - firstConnectedDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays); // Ensure non-negative
    } catch (error) {
      console.error('Error calculating days connected:', error);
      return 0;
    }
  };

  const daysConnected = calculateDaysConnected();

  // Check for punishment on mount and periodically (silently)
  useEffect(() => {
    checkAndApplyPunishment();
    const interval = setInterval(checkAndApplyPunishment, 60 * 1000);
    return () => clearInterval(interval);
  }, [checkAndApplyPunishment]);

  const hasPartner = !!userProfile?.partnerId;
  const isOnboardingStep1 = !hasPartner && onboardingState && !onboardingState.isConnected;
  const isOnboardingStep2 = hasPartner && onboardingState && onboardingState.isConnected && !onboardingState.hasCompletedTutorial;

  // Navigation handlers
  async function handleSendLove() {
    // Step 1: Block if no partner
    if (isOnboardingStep1) {
      // Show toast message
      Alert.alert('Connect First', 'These features activate once your partner connects! ⏳');
      return;
    }
    
    // Step 2: If in tutorial, open hub and show coach mark
    if (isOnboardingStep2) {
      setShowTutorialCoachMark(false);
      await handleTutorialHeartTap();
      router.push('/send-love-menu');
      // Show hub coach mark after navigation
      setTimeout(() => {
        setShowHubCoachMark(true);
      }, 500);
      return;
    }
    
    router.push('/send-love-menu');
  }

  function handleActivities() {
    if (isOnboardingStep1) {
      Alert.alert('Connect First', 'These features activate once your partner connects! ⏳');
      return;
    }
    router.push('/activities-menu');
  }

  function handleGardenShop() {
    if (isOnboardingStep1) {
      Alert.alert('Connect First', 'These features activate once your partner connects! ⏳');
      return;
    }
    router.push('/shop');
  }

  // Planting mode handlers
  const handlePlaceConfirm = useCallback(async (x: number, y: number, flipped?: boolean) => {
    if (!user || !userProfile?.partnerId || !pendingItem) return;

    try {
      // Read fresh wallet data
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        console.error('[Home] User document not found');
        return;
      }

      const userData = userDocSnap.data() as UserProfile;
      const currentWallet = userData.wallet || { gold: 0, water: 0, maxWater: 3 };
      const currentGold = currentWallet.gold || 0;

      // Check if user still has enough gold
      if (currentGold < pendingItem.cost) {
        console.log('[Home] ❌ Not enough gold. Current:', currentGold, 'Required:', pendingItem.cost);
        setPlacementError('Not enough gold!');
        return;
      }

      // Deduct gold
      await updateDoc(userDocRef, {
        'wallet.gold': currentGold - pendingItem.cost,
        updatedAt: serverTimestamp(),
      });

      console.log('[Home] ✅ Deducted', pendingItem.cost, 'gold. Remaining:', currentGold - pendingItem.cost);

      // Plant the item at the specified position
      if (pendingItem.category === 'landmark') {
        const { plantLandmarkAtPosition } = await import('@/utils/gardenState');
        const result = await plantLandmarkAtPosition(
          user.uid,
          userProfile.partnerId,
          pendingItem.type as any, // LandmarkTypeId
          x,
          y,
          flipped
        );

        if (result.success) {
          console.log('[Home] ✅ Landmark placed successfully!');
          // Exit planting mode
          setIsPlantingMode(false);
          setPendingItem(null);
          setPendingPosition(null);
          setPlacementError(null);
        } else {
          console.error('[Home] ❌ Failed to place landmark:', result.error);
          setPlacementError(result.error || 'Failed to place landmark');
        }
      } else if (pendingItem.category === 'decor') {
        // Plant the decor item at the specified position
        const { plantDecorAtPosition } = await import('@/utils/gardenState');
        const result = await plantDecorAtPosition(
          user.uid,
          userProfile.partnerId,
          pendingItem.type as any, // DecorTypeId
          x,
          y,
          flipped
        );

        if (result.success) {
          console.log('[Home] ✅ Decor planted successfully!');
          // Exit planting mode
          setIsPlantingMode(false);
          setPendingItem(null);
          setPendingPosition(null);
          setPlacementError(null);
        } else {
          console.error('[Home] ❌ Failed to plant decor:', result.error);
          setPlacementError(result.error || 'Failed to plant decor');
        }
      } else {
        // Plant the flower at the specified position
        const { plantFlowerAtPosition } = await import('@/utils/gardenState');
        const result = await plantFlowerAtPosition(
          user.uid,
          userProfile.partnerId,
          pendingItem.type as any, // FlowerTypeId
          x,
          y,
          flipped
        );

        if (result.success) {
          console.log('[Home] ✅ Flower planted successfully!');
          
          // Check if this was a first plant
          if (result.isFirstPlant) {
            setFirstPlantCategory(result.isFirstPlant);
            setFirstPlantType(pendingItem.type);
            setShowFirstPlantModal(true);
          }
          
          // Exit planting mode
          setIsPlantingMode(false);
          setPendingItem(null);
          setPendingPosition(null);
          setPlacementError(null);
        } else {
          console.error('[Home] ❌ Failed to plant flower:', result.error);
          setPlacementError(result.error || 'Failed to plant flower');
        }
      }
    } catch (error) {
      console.error('[Home] Placement error:', error);
      setPlacementError('An error occurred. Please try again.');
    }
  }, [user, userProfile, pendingItem]);

  const handlePlaceCancel = useCallback(() => {
    console.log('[Home] Canceling placement');
    setIsPlantingMode(false);
    setPendingItem(null);
    setPendingPosition(null);
    setPlacementError(null);
  }, []);


  // Colors now already have visual theme applied globally in ThemeContext
  // So we can just use colors directly
  const effectiveColors = colors;
  
  // Use theme text color if visual theme is active (overrides settings theme)
  const isVisualThemeActive = visualTheme.id !== 'default';
  const effectiveTextColor = (isVisualThemeActive && visualTheme.textColor) 
    ? visualTheme.textColor 
    : colors.text;
  const effectiveTextColorSecondary = (isVisualThemeActive && visualTheme.textColorSecondary)
    ? visualTheme.textColorSecondary
    : colors.textSecondary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: effectiveColors.background }]} edges={['top']}>
      {/* Background Image (Sky) - Theme-based - Covers entire screen from top to horizon */}
      {visualTheme.backgroundImage && hasAsset(visualTheme.backgroundImage) && (
        <Image
          source={visualTheme.backgroundImage}
          style={[
            styles.backgroundImage,
            {
              // Calculate height from top of screen to horizon
              // Horizon is at: GROUND_FRONT_HEIGHT + GROUND_SURFACE_HEIGHT - 15 from bottom
              // Height = SCREEN_HEIGHT - (GROUND_FRONT_HEIGHT + GROUND_SURFACE_HEIGHT - 15)
              height: SCREEN_HEIGHT - (GROUND_FRONT_HEIGHT + GROUND_SURFACE_HEIGHT - 15),
            }
          ]}
          resizeMode="cover"
        />
      )}
      
      {/* Header Stats */}
      <HeaderStats
        colors={effectiveColors}
        gold={gold}
        water={water}
        maxWater={maxWater}
        daysConnected={daysConnected}
        textColor={effectiveTextColor}
        textColorSecondary={effectiveTextColorSecondary}
      />

      {/* Main Content Area with Scattered Icons */}
      <View style={styles.mainContent}>
        {/* Couple Section - Only show if connected */}
        {hasPartner && (
          <CoupleSection
            key={`couple-${userProfile?.photoURL ? 'has-photo' : 'no-photo'}-${userProfile?.partnerPhotoURL ? 'has-partner-photo' : 'no-partner-photo'}`}
            myPhotoURL={userProfile?.photoURL}
            myDisplayName={userProfile?.nicknameFromPartner || userProfile?.name || 'You'}
            partnerPhotoURL={userProfile?.partnerPhotoURL}
            partnerDisplayName={userProfile?.nicknameForPartner || userProfile?.partnerName || 'Partner'}
            colors={effectiveColors}
            textColor={effectiveTextColor}
          />
        )}

        {/* Partner Connection Status - Only show if NOT connected */}
        {!hasPartner && (
          <TouchableOpacity
            style={[styles.connectPrompt, { backgroundColor: effectiveColors.highlight }]}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Text style={[styles.connectPromptText, { color: effectiveColors.tint }]}>
              Connect with your partner! 💕
            </Text>
          </TouchableOpacity>
        )}

        {/* Scattered Icons Area - Refactored Menu Layout */}
        <View style={styles.iconsArea}>
          {/* Left Hub - Book/Journal (Scrapbook/History) */}
          <ScatteredIcon
            asset={visualTheme.hubIcons.left}
            filename="scrapbook.png"
            onPress={() => {
              if (isOnboardingStep1) {
                Alert.alert('Connect First', 'These features activate once your partner connects! ⏳');
                return;
              }
              router.push('/scrapbook');
            }}
            style={[styles.leftHubPosition, isOnboardingStep1 && styles.dimmedIcon]}
          />

          {/* Middle Hub - Heart/Connection (Love Menu) - Larger */}
          <View
            ref={heartCloudRef}
            style={[
              styles.scatteredIcon,
              styles.middleHubIcon,
              styles.middleHubPosition,
              isOnboardingStep1 && styles.dimmedIcon,
              isOnboardingStep2 && styles.pulsingIcon,
            ]}
            onLayout={() => {
              if (heartCloudRef.current) {
                // Use measureInWindow for more accurate positioning across devices
                heartCloudRef.current.measureInWindow((x, y, width, height) => {
                  setHeartCloudPosition({ x, y });
                });
              }
            }}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={handleSendLove}
              activeOpacity={0.8}
            >
            {hasAsset(visualTheme.hubIcons.middle) ? (
              <Image
                source={visualTheme.hubIcons.middle}
                style={[
                  styles.middleHubImage,
                  isOnboardingStep1 && { opacity: 0.5 },
                ]}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.middleHubPlaceholder, isOnboardingStep1 && { opacity: 0.5 }]}>
                <Text style={styles.placeholderFilename}>send_love.png</Text>
              </View>
            )}
            </TouchableOpacity>
          </View>

          {/* Right Hub - Shop (Market) */}
          <ScatteredIcon
            asset={visualTheme.hubIcons.right}
            filename="gardenshop.png"
            onPress={handleGardenShop}
            style={[styles.rightHubPosition, isOnboardingStep1 && styles.dimmedIcon]}
          />
        </View>

      </View>

      {/* Recently Watered Message - Show only when user tries to water while on cooldown */}
      {/* Moved outside mainContent to ensure it's always visible */}
      {showRecentlyWateredMessage && hasPartner && (
        <Animated.View 
          style={[
            styles.recentlyWateredBanner, 
            { 
              backgroundColor: effectiveColors.highlight, 
              borderColor: effectiveColors.tint,
              opacity: recentlyWateredOpacity,
            }
          ]}
        >
          <Text style={[styles.recentlyWateredText, { color: effectiveColors.tint }]}>
            💧 You've recently watered, no need to water again right now
          </Text>
        </Animated.View>
      )}

      {/* Garden Section - Absolute bottom, above tab bar */}
      <View style={styles.gardenSection}>
        <Garden
          flowers={flowers}
          decor={decor}
          landmarks={landmarks}
          flowerCount={flowerCount}
          health={health}
          streakProgress={streakProgress}
          water={water}
          onWater={async () => {
            // Guard: Don't water if user can't water (6-hour cooldown)
            if (!canWater) {
              console.log('[Home] onWater blocked - canWater is false');
              return;
            }
            
            console.log('[Home] onWater proceeding - canWater is true, calling waterGarden()');
            
            if (user && userProfile?.partnerId) {
              const result = await waterGarden();
              
              console.log('[Home] waterGarden result:', {
                tooSoonToWater: result.tooSoonToWater,
                alreadyWateredToday: result.alreadyWateredToday,
                harmonyBonus: result.harmonyBonus,
                streakReward: result.streakReward,
                isWilted: result.isWilted,
              });
              
              // Check if garden is wilted (24+ hours)
              if (result.isWilted) {
                console.log('[Home] ⚠️ Garden is wilted - showing revival modal');
                setShowWiltedRevivalModal(true);
                return;
              }
              
              // Check if watering was blocked
              if (result.tooSoonToWater) {
                console.log('[Home] ⚠️ Watering blocked - too soon to water (unexpected since canWater was true)');
                showRecentlyWateredMessageWithFade();
                return;
              }
              
              if (result.alreadyWateredToday) {
                console.log('[Home] ⚠️ Watering blocked - already watered today');
                showRecentlyWateredMessageWithFade();
                return;
              }
              
              console.log('[Home] ✅ Watering successful!');
              
              // Show harmony bonus popup if triggered
              if (result.harmonyBonus) {
                setShowHarmonyBonus(true);
              }
              // Show streak reward popup if triggered
              if (result.streakReward) {
                setShowStreakReward(true);
              }
              // Subscription will update UI automatically
            }
          }}
          onWaterBlocked={() => {
            // Show message when user tries to press the disabled button
            showRecentlyWateredMessageWithFade();
          }}
          harmonyState={harmonyState}
          canWater={canWater}
          onRevive={() => {
            console.log('[Home] Revival button pressed - showing revival modal');
            setShowWiltedRevivalModal(true);
          }}
          devGrowthStage={devGrowthStage || undefined}
          devHealth={devHealth || undefined}
          onDevGrowthStageChange={(stage) => setDevGrowthStage(stage)}
          onDevHealthChange={(health) => setDevHealth(health)}
          newlyPlantedFlowerId={params.newlyPlantedFlowerId as string | undefined}
          onDevRemoveLastFlower={async () => {
            if (user && userProfile?.partnerId) {
              await devRemoveLastFlower(user.uid, userProfile.partnerId);
            }
          }}
          onDevAddRose={async () => {
            if (user && userProfile?.partnerId) {
              await devAddRose(user.uid, userProfile.partnerId);
            }
          }}
          onDevRemoveAllFlowers={async () => {
            if (user && userProfile?.partnerId) {
              await devRemoveAllFlowers(user.uid, userProfile.partnerId);
            }
          }}
          onDevRemoveAllLandmarks={async () => {
            if (user && userProfile?.partnerId) {
              await devRemoveAllLandmarks(user.uid, userProfile.partnerId);
            }
          }}
          onDevAddCoins={async () => {
            if (user) {
              const userDocRef = doc(db, 'users', user.uid);
              const userDocSnap = await getDoc(userDocRef);
              
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data() as UserProfile;
                const currentWallet = userData.wallet || { gold: 0, water: 0, maxWater: 3 };
                const currentGold = currentWallet.gold || 0;
                
                await updateDoc(userDocRef, {
                  'wallet.gold': currentGold + 1000,
                  updatedAt: serverTimestamp(),
                });
                
                console.log('[Dev Tools] ✅ Added 1000 coins. New total:', currentGold + 1000);
              }
            }
          }}
          onDevResetQuestion={async () => {
            if (user) {
              const { resetTodaysQuestionStatus } = await import('@/utils/questionOfTheDay');
              await resetTodaysQuestionStatus(user.uid);
              console.log('[Dev Tools] ✅ Reset question of the day status');
            }
          }}
          onDevShowPremiumModal={() => premiumModal.show()}
          isPlantingMode={isPlantingMode}
          pendingItem={pendingItem}
          onPlaceConfirm={handlePlaceConfirm}
          onPlaceCancel={handlePlaceCancel}
          isEditingLandmarks={isEditingLandmarks}
          onEditLandmarksDone={() => setIsEditingLandmarks(false)}
          onLandmarkUpdate={async (landmarkId, x, y) => {
            if (user && userProfile?.partnerId) {
              const { updateLandmarkPosition } = await import('@/utils/gardenState');
              await updateLandmarkPosition(user.uid, userProfile.partnerId, landmarkId, x, y);
            }
          }}
          onLandmarkDelete={async (landmarkId) => {
            if (user && userProfile?.partnerId) {
              const { deleteLandmark } = await import('@/utils/gardenState');
              await deleteLandmark(user.uid, userProfile.partnerId, landmarkId);
            }
          }}
          onLandmarkMoveToFront={async (landmarkId) => {
            if (user && userProfile?.partnerId) {
              const { moveLandmarkToFront } = await import('@/utils/gardenState');
              await moveLandmarkToFront(user.uid, userProfile.partnerId, landmarkId);
            }
          }}
          onLandmarkMoveToBack={async (landmarkId) => {
            if (user && userProfile?.partnerId) {
              const { moveLandmarkToBack } = await import('@/utils/gardenState');
              await moveLandmarkToBack(user.uid, userProfile.partnerId, landmarkId);
            }
          }}
        />
      </View>

      {/* Harmony Bonus Modal */}
      <HarmonyBonusModal
        visible={showHarmonyBonus}
        onClose={() => setShowHarmonyBonus(false)}
      />
      
      {/* Streak Reward Modal */}
      <StreakRewardModal
        visible={showStreakReward}
        onClose={() => setShowStreakReward(false)}
      />
      
      {/* First Plant Modal */}
      {firstPlantCategory && firstPlantType && (
        <FirstPlantModal
          visible={showFirstPlantModal}
          plantCategory={firstPlantCategory}
          flowerType={firstPlantType as any}
          onClose={() => {
            setShowFirstPlantModal(false);
            setFirstPlantCategory(null);
            setFirstPlantType(null);
          }}
        />
      )}
      
      {/* Wilted Revival Modal */}
      <WiltedRevivalModal
        visible={showWiltedRevivalModal}
        userCoins={userProfile?.wallet?.gold || 0}
        onRevive={async () => {
          if (!user || !userProfile?.partnerId) return;
          
          try {
            const result = await reviveWiltedGarden(user.uid, userProfile.partnerId);
            if (result.success) {
              console.log('[Home] ✅ Garden revived successfully!');
              setShowWiltedRevivalModal(false);
              // Refresh user profile to update coins
              const userDocRef = doc(db, 'users', user.uid);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                setUserProfile(userDocSnap.data() as UserProfile);
              }
            } else {
              Alert.alert('Error', result.error || 'Failed to revive garden. Please try again.');
            }
          } catch (error) {
            console.error('[Home] Error reviving garden:', error);
            Alert.alert('Error', 'Failed to revive garden. Please try again.');
          }
        }}
        onClose={() => {
          setShowWiltedRevivalModal(false);
          setHasDismissedWiltedModal(true);
        }}
      />

      {/* Question Reward Notification */}
      <QuestionRewardNotification
        visible={showQuestionRewardNotification}
        partnerName={userProfile?.partnerName || 'Your Partner'}
        rewardCoins={questionRewardCoins}
        onClose={() => setShowQuestionRewardNotification(false)}
      />

      {/* ============================================ */}
      {/* ONBOARDING FLOW UI */}
      {/* ============================================ */}
      
      {/* Step 1: Welcome Overlay */}
      {showWelcomeOverlay && (
        <View style={styles.onboardingOverlay}>
          <View style={[styles.onboardingCard, { backgroundColor: effectiveColors.cardBackground }]}>
            <Text style={[styles.onboardingTitle, { color: effectiveColors.text }]}>
              Welcome to LoveWidgets! 🌱
            </Text>
            <Text style={[styles.onboardingText, { color: effectiveColors.textSecondary }]}>
              Connect to a partner to get started.
            </Text>
            <TouchableOpacity
              style={[styles.onboardingButton, { backgroundColor: effectiveColors.tint }]}
              onPress={() => {
                setShowWelcomeOverlay(false);
                router.push('/(tabs)/settings');
              }}
            >
              <Text style={styles.onboardingButtonText}>Go to Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 2: Tutorial Coach Mark */}
      <OnboardingCoachMark
        visible={showTutorialCoachMark}
        message={
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.coachMarkTitle}>Linked! ❤️</Text>
            <Text style={styles.coachMarkText}>
              {'\n'}In LoveWidgets, daily connection earns you resources. You need{' '}
            </Text>
            <View style={styles.coachMarkInlineRow}>
              <Text style={styles.coachMarkText}>gold</Text>
              {hasAsset(UIAssets.coin) ? (
                <Image source={UIAssets.coin} style={styles.coachMarkIcon} resizeMode="contain" />
              ) : (
                <View style={[styles.coachMarkIcon, { backgroundColor: '#FFD700', borderRadius: 6 }]} />
              )}
              <Text style={styles.coachMarkText}> to buy plants and </Text>
              <Text style={styles.coachMarkText}>water</Text>
              {hasAsset(UIAssets.waterDroplet) ? (
                <Image source={UIAssets.waterDroplet} style={styles.coachMarkIcon} resizeMode="contain" />
              ) : (
                <View style={[styles.coachMarkIcon, { backgroundColor: '#4A90E2', borderRadius: 6 }]} />
              )}
              <Text style={styles.coachMarkText}> to keep them alive.</Text>
            </View>
            <Text style={styles.coachMarkText}>{'\n'}Let's earn your first bucket!</Text>
          </View>
        }
        position="center"
        showDismissButton={true}
        onDismiss={() => {
          setShowTutorialCoachMark(false);
          // After dismissing popup, show spotlight to guide user to heart cloud
          if (hasPartner && heartCloudPosition) {
            setTimeout(() => {
              setShowSpotlight(true);
            }, 300);
          }
        }}
      />

      {/* Step 2: Spotlight Overlay - Shows after popup is dismissed */}
      <SpotlightOverlay
        visible={showSpotlight}
        highlightArea={
          showSpotlight && hasPartner && heartCloudPosition
            ? {
                x: heartCloudPosition.x,
                y: heartCloudPosition.y,
                width: HUB_ICON_SIZE * 1.3,
                height: HUB_ICON_SIZE * 1.3,
              }
            : null
        }
        onDismiss={() => {
          setShowSpotlight(false);
          handleTutorialHeartTap();
        }}
        onHighlightTap={() => {
          setShowSpotlight(false);
          handleTutorialHeartTap();
        }}
      />

      {/* Step 2: Hub Coach Mark (shown in send-love-menu) */}
      {/* Handled in send-love-menu.tsx */}

      {/* Step 3: Reward Popup */}
      <RewardPopup
        visible={showRewardPopup}
        message={rewardMessage}
        waterReward={rewardWater}
        coinReward={rewardCoins}
        onClose={() => {
          setShowRewardPopup(false);
          // Show starter budget modal after reward popup closes
          if (!onboardingState?.hasReceivedStarterBudget) {
            setTimeout(() => {
              setShowStarterBudgetModal(true);
            }, 300);
          }
        }}
      />

      {/* Step 3: Starter Budget Modal */}
      <StarterBudgetModal
        visible={showStarterBudgetModal}
        coinsAwarded={5}
        onGoToShop={async () => {
          setShowStarterBudgetModal(false);
          router.push('/shop');
        }}
        onClose={async () => {
          setShowStarterBudgetModal(false);
          // Mark as received
          await setOnboardingState({ hasReceivedStarterBudget: true });
          setOnboardingStateLocal(prev => prev ? { ...prev, hasReceivedStarterBudget: true } : null);
        }}
      />

      {/* Step 4: First Plant Tip Toast */}
      <FirstPlantTipToast
        visible={showFirstPlantTip}
        onHide={() => setShowFirstPlantTip(false)}
      />

      {/* Step 5: Garden Graduation Modal */}
      <GardenGraduationModal
        visible={showGraduationModal}
        onComplete={async () => {
          setShowGraduationModal(false);
          setShowFirstPlantTip(false); // Also hide Step 4 if still visible
          // Mark tutorial as completed
          await setOnboardingState({ hasCompletedTutorial: true });
          setOnboardingStateLocal(prev => prev ? { ...prev, hasCompletedTutorial: true } : null);
        }}
      />

      {/* Premium Unlock Modal */}
      <PremiumUnlockModal
        visible={premiumModal.isVisible}
        onClose={premiumModal.hide}
        onPurchaseComplete={() => {
          // Premium status will update automatically via subscription
          console.log('[Home] Premium purchase completed');
        }}
      />
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statIcon: {
    width: 16,
    height: 16,
  },
  homeTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  daysConnectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  daysText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Main Content Area - leaves room for garden at bottom
  // Garden height = 196 (flowers) + 62 (surface) + 62 (front) = 320px
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 330, // Garden height + small buffer
  },

  // Couple Section
  coupleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  profileContainer: {
    alignItems: 'center',
    flex: 1,
  },
  profileCircle: {
    width: PROFILE_PHOTO_SIZE,
    height: PROFILE_PHOTO_SIZE,
    borderRadius: PROFILE_PHOTO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  profileName: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: PROFILE_PHOTO_SIZE,
  },
  linkIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: PROFILE_PHOTO_SIZE / 2 - 22, // Center vertically with photos
    borderWidth: 2,
  },

  // Connect Prompt
  connectPrompt: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  connectPromptText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Scattered Icons Area
  iconsArea: {
    flex: 1,
    position: 'relative',
  },

  // Scattered Icon Base
  scatteredIcon: {
    position: 'absolute',
    width: HUB_ICON_SIZE,
    height: HUB_ICON_SIZE,
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  iconPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0E8F8',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D8C8E8',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderFilename: {
    fontSize: 9,
    color: '#A090B0',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Scattered Positions - Refactored Menu Layout
  leftHubPosition: {
    top: 70,
    left: 30,
  },
  middleHubPosition: {
    top: 40,
    alignSelf: 'center',
  },
  rightHubPosition: {
    top: 70,
    right: 30,
  },
  // Middle Hub - Larger than other icons (primary action)
  middleHubIcon: {
    width: HUB_ICON_SIZE * 1.3, // 30% larger
    height: HUB_ICON_SIZE * 1.3, // 30% larger
  },
  middleHubImage: {
    width: '100%',
    height: '100%',
  },
  middleHubPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200, 200, 200, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderStyle: 'dashed',
  },

  // Garden Section - Fixed at absolute bottom, hugging tab bar
  gardenSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  
  // Recently Watered Message
  recentlyWateredBanner: {
    position: 'absolute',
    top: 160, // Below planting mode banner
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  recentlyWateredText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Background covers from top of screen to horizon line (where landmarks bottom is)
    // The horizon line is where landmarks start, which is at the top of the ground surface
    // Garden section is positioned at bottom: 0 (above tab bar)
    // Horizon from screen bottom = GROUND_FRONT_HEIGHT + GROUND_SURFACE_HEIGHT - 15
    // Height is calculated explicitly to prevent over-scaling
    width: '100%',
    zIndex: 0, // Behind everything (header, hubs, profile, garden elements)
  },

  // Onboarding Styles
  onboardingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  onboardingCard: {
    borderRadius: 20,
    padding: 24,
    maxWidth: 340,
    width: '100%',
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
  onboardingTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  onboardingText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  onboardingButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  onboardingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dimmedIcon: {
    opacity: 0.5,
  },
  pulsingIcon: {
    // Pulse animation will be handled by coach mark overlay
  },

  // Coach Mark Message Styles
  coachMarkTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  coachMarkText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  coachMarkInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  coachMarkIcon: {
    width: 20,
    height: 20,
    marginHorizontal: 4,
  },

});
