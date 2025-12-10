/**
 * useGardenStatus Hook
 * Manages SHARED garden state between connected partners
 * Both partners see and interact with the same garden in real-time
 */

import { FlowerTypeId } from '@/constants/FlowerMarket';
import { useAuth } from '@/context/AuthContext';
import {
  applySharedPunishment,
  calculateGardenStatus,
  canUserWater,
  FlowerHealth,
  GardenState,
  GardenStatus,
  PlantedFlower,
  PlantedDecor,
  PlantedLandmark,
  subscribeToSharedGardenState,
  updateSharedGardenState,
  waterSharedGarden,
} from '@/utils/gardenState';
import { subscribeToUserProfile, UserProfile } from '@/utils/pairing';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================
// TYPES
// ============================================

interface UseGardenStatusReturn {
  // State
  gardenState: GardenState | null;
  gardenStatus: GardenStatus;
  isLoading: boolean;
  hasPartner: boolean;

  // Computed
  flowerCount: number;
  streakProgress: number;
  health: FlowerHealth;
  hoursSinceInteraction: number;
  flowers: PlantedFlower[];
  decor: PlantedDecor[];
  landmarks: PlantedLandmark[];
  wateredByToday: string[]; // Array of userIDs who watered today
  harmonyState: 'wilt' | 'normal' | 'harmony'; // UI state based on watering
  canWater: boolean; // True if user can water (6-hour cooldown check)
  hasPendingHarmonyBonus: boolean; // True if user should see harmony bonus notification

  // Actions
  waterGarden: () => Promise<{ alreadyWateredToday: boolean; tooSoonToWater: boolean; harmonyBonus: boolean; streakReward: boolean; isWilted?: boolean }>;
  checkAndApplyPunishment: () => Promise<boolean>;
  refreshStatus: () => void;
  clearPendingHarmonyBonus: () => Promise<void>; // Clear pending notification after showing
}

// ============================================
// DEFAULT STATUS
// ============================================

const DEFAULT_STATUS: GardenStatus = {
  health: 'fresh',
  hoursSinceInteraction: 0,
  flowerCount: 1,
  streakProgress: 0,
  needsPunishment: false,
};

// ============================================
// HOOK
// ============================================

export function useGardenStatus(): UseGardenStatusReturn {
  const { user } = useAuth();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gardenState, setGardenState] = useState<GardenState | null>(null);
  const [gardenStatus, setGardenStatus] = useState<GardenStatus>(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(true);

  const partnerId = userProfile?.partnerId || null;
  const hasPartner = !!partnerId;

  // Subscribe to user profile to get partnerId
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToUserProfile(user.uid, (profile) => {
      setUserProfile(profile);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to SHARED garden state once we have a partner
  useEffect(() => {
    if (!user || !partnerId) {
      setIsLoading(false);
      setGardenState(null);
      setGardenStatus(DEFAULT_STATUS);
      return;
    }

    setIsLoading(true);
    console.log('[Garden Hook] Subscribing to shared garden with partner:', partnerId);

    const unsubscribe = subscribeToSharedGardenState(user.uid, partnerId, (state) => {
      console.log('[Garden Hook] Received shared garden update:', state.coupleConnectionLevel, 'flowers');
      setGardenState(state);
      setGardenStatus(calculateGardenStatus(state));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, partnerId]);

  // Refresh status periodically (every minute) to update health display
  useEffect(() => {
    const interval = setInterval(() => {
      if (gardenState?.lastSuccessfulInteraction) {
        setGardenStatus(calculateGardenStatus(gardenState));
      }
    }, 60 * 1000); // Every minute

    return () => clearInterval(interval);
  }, [gardenState]);

  // Water the shared garden (called when sending a letter)
  // Roommate Model: Checks wallet, tracks wateredByToday, handles harmony bonus
  const waterGarden = useCallback(async (): Promise<{ alreadyWateredToday: boolean; tooSoonToWater: boolean; harmonyBonus: boolean; streakReward: boolean; isWilted?: boolean }> => {
    if (!user || !partnerId) {
      console.log('[Garden Hook] Cannot water: no partner connected');
      return { alreadyWateredToday: false, tooSoonToWater: false, harmonyBonus: false, streakReward: false, isWilted: false };
    }

    try {
      const result = await waterSharedGarden(user.uid, partnerId);
      // Update state immediately (before subscription fires)
      setGardenState(result.state);
      setGardenStatus(calculateGardenStatus(result.state));
      
      // Log the updated state
      const lastWateredByUser = result.state.lastWateredByUser || {};
      console.log('[Garden Hook] After watering - lastWateredByUser:', JSON.stringify(lastWateredByUser), 'userId:', user.uid, 'userLastWatered:', lastWateredByUser[user.uid] ? lastWateredByUser[user.uid].toMillis() : 'undefined');
      
      return { 
        alreadyWateredToday: result.alreadyWateredToday,
        tooSoonToWater: result.tooSoonToWater,
        harmonyBonus: result.harmonyBonus,
        streakReward: result.streakReward,
        isWilted: result.isWilted,
      };
    } catch (error) {
      console.error('[Garden Hook] Failed to water shared garden:', error);
      return { alreadyWateredToday: false, tooSoonToWater: false, harmonyBonus: false, streakReward: false, isWilted: false };
    }
  }, [user, partnerId]);

  // Check if punishment is needed and apply it
  // Use a ref to track if punishment check is in progress to prevent infinite loops
  const punishmentCheckInProgress = useRef(false);
  
  const checkAndApplyPunishment = useCallback(async (): Promise<boolean> => {
    if (!user || !partnerId || !gardenState) return false;
    
    // Prevent concurrent punishment checks
    if (punishmentCheckInProgress.current) {
      console.log('[Garden Hook] ⚠️ Punishment check already in progress, skipping');
      return false;
    }

    const status = calculateGardenStatus(gardenState);

    if (status.needsPunishment) {
      punishmentCheckInProgress.current = true;
      try {
        const newState = await applySharedPunishment(user.uid, partnerId);
        
        // Only update state if punishment was actually applied (state changed)
        // applySharedPunishment returns current state if already punished
        if (newState.coupleConnectionLevel !== gardenState.coupleConnectionLevel || 
            newState.activeStreakDays !== gardenState.activeStreakDays) {
          setGardenState(newState);
          setGardenStatus(calculateGardenStatus(newState));
          punishmentCheckInProgress.current = false;
          return true;
        } else {
          // Punishment already applied, no state change needed
          punishmentCheckInProgress.current = false;
          return false;
        }
      } catch (error) {
        console.error('[Garden Hook] Failed to apply shared punishment:', error);
        punishmentCheckInProgress.current = false;
      }
    }

    return false;
  }, [user, partnerId, gardenState]);


  // Manual refresh
  const refreshStatus = useCallback(() => {
    if (gardenState?.lastSuccessfulInteraction) {
      setGardenStatus(calculateGardenStatus(gardenState));
    }
  }, [gardenState]);

  // Calculate harmony state based on wateredByToday and lastWatered
  const wateredByToday = gardenState?.wateredByToday || [];
  const harmonyState: 'wilt' | 'normal' | 'harmony' = (() => {
    // Wilt state: if lastWatered > 24h
    if (gardenStatus.health === 'wilted') {
      return 'wilt';
    }
    // Harmony state: if both partners watered today
    if (wateredByToday.length === 2) {
      return 'harmony';
    }
    // Normal state: if one person watered
    return 'normal';
  })();

  // Check if user can water (6-hour cooldown)
  // Recalculate whenever gardenState changes
  const canWater = useMemo(() => {
    if (!user || !gardenState) {
      console.log('[Garden Hook] canWater: false (no user or gardenState)');
      return false;
    }
    const result = canUserWater(gardenState, user.uid);
    console.log('[Garden Hook] canWater check:', result, 'userId:', user.uid, 'lastWateredByUser:', JSON.stringify(gardenState.lastWateredByUser));
    return result;
  }, [user, gardenState]);

  // Check if user has pending harmony bonus notification
  const hasPendingHarmonyBonus = useMemo(() => {
    if (!user || !gardenState) {
      return false;
    }
    const pendingHarmonyBonusFor = gardenState.pendingHarmonyBonusFor || [];
    const hasPending = pendingHarmonyBonusFor.includes(user.uid);
    if (hasPending) {
      console.log('[Garden Hook] User has pending harmony bonus notification');
    }
    return hasPending;
  }, [user, gardenState]);

  // Clear pending harmony bonus notification after showing
  const clearPendingHarmonyBonus = useCallback(async (): Promise<void> => {
    if (!user || !partnerId || !gardenState) {
      return;
    }

    const pendingHarmonyBonusFor = gardenState.pendingHarmonyBonusFor || [];
    if (!pendingHarmonyBonusFor.includes(user.uid)) {
      return; // Already cleared or not pending
    }

    // Remove user from pending list
    const updatedPending = pendingHarmonyBonusFor.filter(id => id !== user.uid);
    
    try {
      await updateSharedGardenState(user.uid, partnerId, {
        pendingHarmonyBonusFor: updatedPending,
      });
      console.log('[Garden Hook] ✅ Cleared pending harmony bonus notification for user:', user.uid);
    } catch (error) {
      console.error('[Garden Hook] Failed to clear pending harmony bonus:', error);
    }
  }, [user, partnerId, gardenState]);

  return {
    // State
    gardenState,
    gardenStatus,
    isLoading,
    hasPartner,

    // Computed
    flowerCount: gardenStatus.flowerCount,
    streakProgress: gardenStatus.streakProgress,
    health: gardenStatus.health,
    hoursSinceInteraction: gardenStatus.hoursSinceInteraction,
    flowers: gardenState?.flowers || [],
    decor: gardenState?.decor || [],
    landmarks: gardenState?.landmarks || [],
    wateredByToday,
    harmonyState,
    canWater,
    hasPendingHarmonyBonus,

    // Actions
    waterGarden,
    checkAndApplyPunishment,
    refreshStatus,
    clearPendingHarmonyBonus,
  };
}
