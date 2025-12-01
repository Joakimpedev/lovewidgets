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
  FlowerHealth,
  GardenState,
  GardenStatus,
  PlantedFlower,
  plantFlower,
  subscribeToSharedGardenState,
  waterSharedGarden,
  devSimulateTimePassing,
  devWaterGarden
} from '@/utils/gardenState';
import { subscribeToUserProfile, UserProfile } from '@/utils/pairing';
import { useCallback, useEffect, useState } from 'react';

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
  pendingFlowerSlot: number | null;
  pendingFlowerPicker: string | null;
  isMyTurnToPick: boolean; // True if current user triggered level up
  showLevelUpModal: boolean;

  // Actions
  waterGarden: () => Promise<{ leveledUp: boolean; newSlot: number | null; alreadyWateredToday: boolean }>;
  checkAndApplyPunishment: () => Promise<boolean>;
  selectFlowerForSlot: (flowerType: FlowerTypeId) => Promise<void>;
  dismissLevelUpModal: () => void;

  // Dev/Test Actions
  devAddHours: (hours: number) => Promise<void>;
  devSimulateSend: () => Promise<void>;
  refreshStatus: () => void;
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
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [pendingSlotFromWatering, setPendingSlotFromWatering] = useState<number | null>(null);

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
  // "Gardener of the Day" rule: Only counts once per calendar day
  const waterGarden = useCallback(async (): Promise<{ leveledUp: boolean; newSlot: number | null; alreadyWateredToday: boolean }> => {
    if (!user || !partnerId) {
      console.log('[Garden Hook] Cannot water: no partner connected');
      return { leveledUp: false, newSlot: null, alreadyWateredToday: false };
    }

    try {
      const result = await waterSharedGarden(user.uid, partnerId);
      setGardenState(result.state);
      setGardenStatus(calculateGardenStatus(result.state));
      
      // Show level up modal ONLY if this user is the picker
      if (result.leveledUp && result.newSlot !== null && result.state.pendingFlowerPicker === user.uid) {
        setPendingSlotFromWatering(result.newSlot);
        setShowLevelUpModal(true);
      }
      
      return { leveledUp: result.leveledUp, newSlot: result.newSlot, alreadyWateredToday: result.alreadyWateredToday };
    } catch (error) {
      console.error('[Garden Hook] Failed to water shared garden:', error);
      return { leveledUp: false, newSlot: null, alreadyWateredToday: false };
    }
  }, [user, partnerId]);

  // Check if punishment is needed and apply it
  const checkAndApplyPunishment = useCallback(async (): Promise<boolean> => {
    if (!user || !partnerId || !gardenState) return false;

    const status = calculateGardenStatus(gardenState);

    if (status.needsPunishment) {
      try {
        const newState = await applySharedPunishment(user.uid, partnerId);
        setGardenState(newState);
        setGardenStatus(calculateGardenStatus(newState));
        return true;
      } catch (error) {
        console.error('[Garden Hook] Failed to apply shared punishment:', error);
      }
    }

    return false;
  }, [user, partnerId, gardenState]);

  // Dev: Simulate time passing (makes lastSuccessfulInteraction older)
  // This makes the garden appear neglected for X hours
  const devAddHours = useCallback(
    async (hours: number) => {
      if (!user || !partnerId) {
        console.log('[Garden Hook] Cannot simulate: no partner connected');
        return;
      }

      try {
        await devSimulateTimePassing(user.uid, partnerId, hours);
        // State will update via subscription, health will recalculate automatically
      } catch (error) {
        console.error('[Garden Hook] Failed to simulate time:', error);
      }
    },
    [user, partnerId]
  );

  // Dev: Simulate sending a letter (bypasses "Gardener of the Day" check)
  // Allows multiple waterings in a row for testing
  const devSimulateSend = useCallback(async () => {
    if (!user || !partnerId) {
      console.log('[Garden Hook] Cannot water: no partner connected');
      return;
    }

    try {
      const result = await devWaterGarden(user.uid, partnerId);
      setGardenState(result.state);
      setGardenStatus(calculateGardenStatus(result.state));
      
      // Show level up modal ONLY if this user is the picker
      if (result.leveledUp && result.newSlot !== null && result.state.pendingFlowerPicker === user.uid) {
        setShowLevelUpModal(true);
        setPendingSlotFromWatering(result.newSlot);
      }
    } catch (error) {
      console.error('[Garden Hook] Failed to water garden:', error);
    }
  }, [user, partnerId]);

  // Manual refresh
  const refreshStatus = useCallback(() => {
    if (gardenState?.lastSuccessfulInteraction) {
      setGardenStatus(calculateGardenStatus(gardenState));
    }
  }, [gardenState]);

  // Select flower type for planting (after level up)
  // Slot is automatically randomized from available slots
  const selectFlowerForSlot = useCallback(
    async (flowerType: FlowerTypeId) => {
      if (!user || !partnerId) {
        console.log('[Garden Hook] Cannot plant: no partner connected');
        return;
      }

      // Check if we have a pending flower to plant
      const hasPending = pendingSlotFromWatering !== null || 
                         (gardenState?.pendingFlowerSlot !== null && gardenState?.pendingFlowerSlot !== undefined);
      if (!hasPending) {
        console.log('[Garden Hook] No pending flower to plant');
        return;
      }

      try {
        await plantFlower(user.uid, partnerId, flowerType);
        setPendingSlotFromWatering(null);
        setShowLevelUpModal(false);
        // State will update via subscription
      } catch (error) {
        console.error('[Garden Hook] Failed to plant flower:', error);
      }
    },
    [user, partnerId, pendingSlotFromWatering, gardenState?.pendingFlowerSlot]
  );

  // Dismiss level up modal without selecting
  const dismissLevelUpModal = useCallback(() => {
    setShowLevelUpModal(false);
    // Keep pendingFlowerSlot in state so user can select later
  }, []);

  // Show modal ONLY if current user is the pending picker
  // If partner is the picker, they see the modal, we see status text
  useEffect(() => {
    if (!user) return;
    
    const hasPendingSlot = gardenState?.pendingFlowerSlot !== null && gardenState?.pendingFlowerSlot !== undefined;
    const isMyTurn = gardenState?.pendingFlowerPicker === user.uid;
    
    if (hasPendingSlot && isMyTurn && !showLevelUpModal && pendingSlotFromWatering === null) {
      setShowLevelUpModal(true);
    }
  }, [user, gardenState?.pendingFlowerSlot, gardenState?.pendingFlowerPicker, showLevelUpModal, pendingSlotFromWatering]);

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
    pendingFlowerSlot: pendingSlotFromWatering ?? gardenState?.pendingFlowerSlot ?? null,
    pendingFlowerPicker: gardenState?.pendingFlowerPicker ?? null,
    isMyTurnToPick: user ? gardenState?.pendingFlowerPicker === user.uid : false,
    showLevelUpModal,

    // Actions
    waterGarden,
    checkAndApplyPunishment,
    selectFlowerForSlot,
    dismissLevelUpModal,

    // Dev Actions
    devAddHours,
    devSimulateSend,
    refreshStatus,
  };
}
