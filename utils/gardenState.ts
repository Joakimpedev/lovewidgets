/**
 * Garden State Management for LoveWidgets
 * Handles the garden gamification data model and Firestore operations
 * 
 * SHARED GARDEN: Both connected partners see and interact with the SAME garden.
 * The garden is stored under a "connectionId" which is deterministic based on both user IDs.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';

// ============================================
// TYPES
// ============================================

import { FlowerTypeId } from '@/constants/FlowerMarket';
import { FlowerVariant } from '@/constants/Assets';

/**
 * Individual flower planted in the garden
 */
export interface PlantedFlower {
  id: string; // Unique ID for this flower
  type: FlowerTypeId; // 'rose', 'tulip', etc.
  variant: FlowerVariant; // 'v1', 'v2', 'v3'
  plantedAt: number; // Timestamp when planted (ms)
  slot: number; // Position slot (0-8)
}

/**
 * Growth stage based on days since planting
 * - sapling: Day 0 (just planted)
 * - growing: Day 1 (50% size)
 * - mature: Day 2+ (full size)
 */
export type GrowthStage = 'sapling' | 'growing' | 'mature';

export interface GardenState {
  coupleConnectionLevel: number; // Min 1 - number of flowers
  activeStreakDays: number; // 0, 1, or 2 - progress toward next flower
  lastSuccessfulInteraction: Timestamp | null; // Last letter/action sent
  lastWateredBy: string | null; // User ID who last watered
  user1Id: string; // First partner
  user2Id: string; // Second partner
  updatedAt: Timestamp | null;
  flowers: PlantedFlower[]; // Individual flowers in the garden
  pendingFlowerSlot: number | null; // Slot waiting for flower selection (after level up)
  pendingFlowerPicker: string | null; // User ID who triggered level up and gets to pick
  variantCycleIndex: number | null; // Current position in variant cycle (0=v1, 1=v2, 2=v3), null=random next
}

export type FlowerHealth = 'fresh' | 'wilting' | 'wilted';

export interface GardenStatus {
  health: FlowerHealth;
  hoursSinceInteraction: number;
  flowerCount: number;
  streakProgress: number; // 0, 1, or 2
  needsPunishment: boolean; // true if > 24 hours
}

// ============================================
// DEFAULT STATE
// ============================================

export const DEFAULT_GARDEN_STATE: Omit<GardenState, 'user1Id' | 'user2Id'> = {
  coupleConnectionLevel: 1,
  activeStreakDays: 0,
  lastSuccessfulInteraction: null,
  lastWateredBy: null,
  updatedAt: null,
  flowers: [], // Will be populated when first flower is chosen
  pendingFlowerSlot: 0, // First slot needs a flower
  pendingFlowerPicker: null, // Who gets to pick the next flower
  variantCycleIndex: null, // null = random first, then cycles 0→1→2→0...
};

// ============================================
// CONNECTION ID HELPERS
// ============================================

/**
 * Generate a deterministic connection ID from two user IDs
 * Always returns the same ID regardless of order
 */
export function getConnectionId(userId1: string, userId2: string): string {
  // Sort alphabetically to ensure consistent ID
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Check if a timestamp is from today (same calendar day)
 */
export function isToday(timestamp: Timestamp | null): boolean {
  if (!timestamp) return false;
  
  const date = new Date(timestamp.toMillis());
  const today = new Date();
  
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

// ============================================
// FIRESTORE OPERATIONS
// ============================================

/**
 * Get or create shared garden state for a connection
 */
export async function getSharedGardenState(
  userId: string,
  partnerId: string
): Promise<GardenState> {
  const connectionId = getConnectionId(userId, partnerId);
  const docRef = doc(db, 'gardens', connectionId);

  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as GardenState;
  }

  // Create default state if doesn't exist
  const [user1Id, user2Id] = [userId, partnerId].sort();
  const defaultState: GardenState = {
    ...DEFAULT_GARDEN_STATE,
    user1Id,
    user2Id,
    lastSuccessfulInteraction: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(docRef, defaultState);
  console.log('[Garden] 🌱 Created new shared garden for connection:', connectionId);
  return defaultState;
}

/**
 * Subscribe to shared garden state changes
 * Both partners will receive real-time updates
 */
export function subscribeToSharedGardenState(
  userId: string,
  partnerId: string,
  callback: (state: GardenState) => void
): () => void {
  const connectionId = getConnectionId(userId, partnerId);
  const docRef = doc(db, 'gardens', connectionId);

  console.log('[Garden] 👀 Subscribing to shared garden:', connectionId);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as GardenState);
      } else {
        // Create default if doesn't exist
        const [user1Id, user2Id] = [userId, partnerId].sort();
        const defaultState: GardenState = {
          ...DEFAULT_GARDEN_STATE,
          user1Id,
          user2Id,
          lastSuccessfulInteraction: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        setDoc(docRef, defaultState);
        callback(defaultState);
      }
    },
    (error) => {
      console.error('[Garden] Subscription error:', error);
    }
  );
}

/**
 * Update shared garden state in Firestore
 */
export async function updateSharedGardenState(
  userId: string,
  partnerId: string,
  updates: Partial<GardenState>
): Promise<void> {
  const connectionId = getConnectionId(userId, partnerId);
  const docRef = doc(db, 'gardens', connectionId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Water the shared garden (called when sending a letter/action)
 * Both partners will see the update in real-time
 * 
 * "Gardener of the Day" Rule: Only ONE watering counts per calendar day
 */
export async function waterSharedGarden(
  userId: string,
  partnerId: string
): Promise<{ state: GardenState; leveledUp: boolean; newSlot: number | null; alreadyWateredToday: boolean }> {
  const currentState = await getSharedGardenState(userId, partnerId);

  // Check if this is the first interaction (no flowers planted yet)
  const flowers = currentState.flowers || [];
  const isFirstFlower = flowers.length === 0;

  // "Gardener of the Day" Rule: Check if already watered today
  const alreadyWateredToday = isToday(currentState.lastSuccessfulInteraction);
  
  // If already watered today and not first flower, just return without affecting streak
  if (alreadyWateredToday && !isFirstFlower) {
    console.log('[Garden] 📅 Already watered today! Letter sent but no streak change.');
    return { 
      state: currentState, 
      leveledUp: false, 
      newSlot: null,
      alreadyWateredToday: true 
    };
  }

  let newLevel = currentState.coupleConnectionLevel;
  let newStreakDays = currentState.activeStreakDays + 1;
  let leveledUp = false;
  let newSlot: number | null = null;
  let pendingPicker: string | null = currentState.pendingFlowerPicker;

  // Level up if streak reaches 3
  if (newStreakDays >= 3) {
    newLevel += 1;
    newStreakDays = 0;
    leveledUp = true;
    newSlot = newLevel - 1; // Slot for the new flower (0-indexed)
    pendingPicker = userId; // The person who triggered level up gets to pick
    console.log('[Garden] 🌸 Level up! New level:', newLevel, 'Picker:', userId);
  }

  // If first interaction and no flowers yet, prompt to plant first flower
  if (isFirstFlower && !leveledUp) {
    leveledUp = true;
    newSlot = 0; // First slot
    pendingPicker = userId; // First person to water gets to pick
    console.log('[Garden] 🌱 First water! Picker:', userId);
  }

  // Build update object
  const newState: Partial<GardenState> = {
    coupleConnectionLevel: newLevel,
    activeStreakDays: newStreakDays,
    lastSuccessfulInteraction: Timestamp.now(),
    lastWateredBy: userId,
  };

  // Set pendingFlowerSlot and pendingFlowerPicker
  if (leveledUp && newSlot !== null) {
    newState.pendingFlowerSlot = newSlot;
    newState.pendingFlowerPicker = pendingPicker;
  } else {
    // Keep existing values or null
    newState.pendingFlowerSlot = currentState.pendingFlowerSlot ?? null;
    newState.pendingFlowerPicker = currentState.pendingFlowerPicker ?? null;
  }

  await updateSharedGardenState(userId, partnerId, newState);
  console.log('[Garden] 💧 Watered by', userId, '! Streak:', newStreakDays, '/', 3, 'Level:', newLevel);

  const updatedState: GardenState = {
    ...currentState,
    ...newState,
    lastSuccessfulInteraction: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  return { state: updatedState, leveledUp, newSlot, alreadyWateredToday: false };
}

/**
 * Apply punishment for missing 24 hours
 * Reduces level by 1 (min 1) and resets streak
 * Does NOT reset lastSuccessfulInteraction - garden stays wilted until watered
 */
export async function applySharedPunishment(
  userId: string,
  partnerId: string
): Promise<GardenState> {
  const currentState = await getSharedGardenState(userId, partnerId);

  const newLevel = Math.max(1, currentState.coupleConnectionLevel - 1);
  
  // Remove the most recently planted flower (if we have flowers and level decreased)
  let updatedFlowers = currentState.flowers || [];
  let resetCycle = false;
  
  if (newLevel < currentState.coupleConnectionLevel && updatedFlowers.length > 0) {
    // Sort by plantedAt descending (newest first) and remove the newest one
    updatedFlowers = [...updatedFlowers].sort((a, b) => b.plantedAt - a.plantedAt);
    const removedFlower = updatedFlowers.shift(); // Remove newest
    resetCycle = true; // Reset variant cycle when flower is removed
    console.log('[Garden] 💀 Removed flower:', removedFlower?.type, 'from slot', removedFlower?.slot);
    console.log('[Garden] 🔄 Variant cycle reset to random');
  }

  const newState: Partial<GardenState> = {
    coupleConnectionLevel: newLevel,
    activeStreakDays: 0,
    // DON'T reset lastSuccessfulInteraction - keep the old timestamp so garden stays wilted
    // It will only become fresh again when someone actually waters it
    flowers: updatedFlowers,
    variantCycleIndex: resetCycle ? null : currentState.variantCycleIndex, // Reset cycle if flower removed
  };

  await updateSharedGardenState(userId, partnerId, newState);
  console.log('[Garden] 💔 Shared punishment applied! Level reduced to:', newLevel, 'Flowers remaining:', updatedFlowers.length);

  return {
    ...currentState,
    ...newState,
    // Keep the original lastSuccessfulInteraction timestamp
    updatedAt: Timestamp.now(),
  };
}

/**
 * Calculate garden health status based on time
 * This is calculated in REAL-TIME based on current time vs lastSuccessfulInteraction
 */
export function calculateGardenStatus(state: GardenState): GardenStatus {
  const now = Date.now();
  const lastInteraction = state.lastSuccessfulInteraction?.toMillis() || now;
  const hoursSinceInteraction = (now - lastInteraction) / (1000 * 60 * 60);

  let health: FlowerHealth;
  if (hoursSinceInteraction < 12) {
    health = 'fresh';
  } else if (hoursSinceInteraction < 18) {
    health = 'wilting';
  } else {
    health = 'wilted';
  }

  return {
    health,
    hoursSinceInteraction,
    flowerCount: state.coupleConnectionLevel,
    streakProgress: state.activeStreakDays,
    needsPunishment: hoursSinceInteraction > 24,
  };
}

// ============================================
// FLOWER PLANTING & GROWTH
// ============================================

/**
 * Calculate growth stage based on days since planting
 * - Day 0: sapling
 * - Day 1: growing (50% size)
 * - Day 2+: mature (full size)
 */
export function getGrowthStage(plantedAt: number): GrowthStage {
  const now = Date.now();
  const daysSincePlanting = (now - plantedAt) / (1000 * 60 * 60 * 24);
  
  if (daysSincePlanting < 1) {
    return 'sapling';
  } else if (daysSincePlanting < 2) {
    return 'growing';
  } else {
    return 'mature';
  }
}

/**
 * Get the scale factor for a flower based on growth stage
 */
export function getGrowthScale(stage: GrowthStage): number {
  switch (stage) {
    case 'sapling':
      return 0.7; // Sapling is smaller
    case 'growing':
      return 0.5; // 50% size on day 1
    case 'mature':
      return 1.0; // Full size
  }
}

/**
 * Find an available slot for a new flower
 */
function findAvailableSlot(flowers: PlantedFlower[]): number {
  const usedSlots = new Set(flowers.map(f => f.slot));
  
  // Try slots 0-8
  for (let i = 0; i < 9; i++) {
    if (!usedSlots.has(i)) {
      return i;
    }
  }
  
  // If all slots taken, return next number
  return flowers.length;
}

/**
 * Plant a flower in the garden (after level up selection)
 * Slot is randomized from available slots
 * Variant follows a cycle: random first, then v1 → v2 → v3 → v1...
 * Cycle resets to random when a flower is removed (decay)
 */
export async function plantFlower(
  userId: string,
  partnerId: string,
  flowerType: FlowerTypeId
): Promise<void> {
  const state = await getSharedGardenState(userId, partnerId);
  const flowers = state.flowers || [];
  
  // Find a random available slot
  const slot = findAvailableSlot(flowers);
  
  // Determine variant using cycle
  const allVariants: FlowerVariant[] = ['v1', 'v2', 'v3'];
  let variant: FlowerVariant;
  let nextCycleIndex: number;
  
  if (state.variantCycleIndex === null || state.variantCycleIndex === undefined) {
    // Cycle is reset (first time or after decay) - pick random
    const randomIndex = Math.floor(Math.random() * allVariants.length);
    variant = allVariants[randomIndex];
    nextCycleIndex = (randomIndex + 1) % 3; // Next in cycle
    console.log('[Garden] 🎲 Random variant:', variant);
  } else {
    // Continue the cycle
    variant = allVariants[state.variantCycleIndex];
    nextCycleIndex = (state.variantCycleIndex + 1) % 3;
    console.log('[Garden] 🔄 Cycled variant:', variant);
  }
  
  const newFlower: PlantedFlower = {
    id: `flower_${Date.now()}_${slot}`,
    type: flowerType,
    variant,
    plantedAt: Date.now(),
    slot,
  };
  
  const updatedFlowers = [...flowers, newFlower];
  
  await updateSharedGardenState(userId, partnerId, {
    flowers: updatedFlowers,
    pendingFlowerSlot: null, // Clear pending slot
    pendingFlowerPicker: null, // Clear pending picker
    variantCycleIndex: nextCycleIndex, // Move to next in cycle
  });
  
  console.log('[Garden] 🌱 Planted', flowerType, variant, 'in slot', slot);
}

// ============================================
// DEV TOOLS (Safe testing functions)
// ============================================

/**
 * DEV: Simulate time passing by making lastSuccessfulInteraction older
 * This makes the garden appear to have been neglected for X hours
 * Safe for testing - doesn't break real-time logic
 */
export async function devSimulateTimePassing(
  userId: string,
  partnerId: string,
  hours: number
): Promise<void> {
  const currentState = await getSharedGardenState(userId, partnerId);
  
  if (!currentState.lastSuccessfulInteraction) {
    // If no interaction yet, set it to X hours ago
    const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);
    await updateSharedGardenState(userId, partnerId, {
      lastSuccessfulInteraction: Timestamp.fromMillis(hoursAgo),
    });
    console.log('[Garden] ⏰ [DEV] Set initial interaction to', hours, 'hours ago');
    return;
  }
  
  // Make the timestamp older by subtracting hours
  const currentTime = currentState.lastSuccessfulInteraction.toMillis();
  const newTime = currentTime - (hours * 60 * 60 * 1000);
  
  await updateSharedGardenState(userId, partnerId, {
    lastSuccessfulInteraction: Timestamp.fromMillis(newTime),
  });
  
  console.log('[Garden] ⏰ [DEV] Simulated', hours, 'hours passing. Health will update automatically.');
}

/**
 * DEV: Water garden bypassing "Gardener of the Day" check
 * Allows multiple waterings in a row for testing
 * Safe - only used by dev tools, real users use waterSharedGarden()
 */
export async function devWaterGarden(
  userId: string,
  partnerId: string
): Promise<{ state: GardenState; leveledUp: boolean; newSlot: number | null }> {
  const currentState = await getSharedGardenState(userId, partnerId);

  const flowers = currentState.flowers || [];
  const isFirstFlower = flowers.length === 0;

  // DEV MODE: Skip the "Gardener of the Day" check - always allow watering
  let newLevel = currentState.coupleConnectionLevel;
  let newStreakDays = currentState.activeStreakDays + 1;
  let leveledUp = false;
  let newSlot: number | null = null;
  let pendingPicker: string | null = currentState.pendingFlowerPicker;

  // Level up if streak reaches 3
  if (newStreakDays >= 3) {
    newLevel += 1;
    newStreakDays = 0;
    leveledUp = true;
    newSlot = newLevel - 1;
    pendingPicker = userId;
    console.log('[Garden] 🌸 [DEV] Level up! New level:', newLevel);
  }

  // If first interaction and no flowers yet, prompt to plant first flower
  if (isFirstFlower && !leveledUp) {
    leveledUp = true;
    newSlot = 0;
    pendingPicker = userId;
    console.log('[Garden] 🌱 [DEV] First water!');
  }

  const newState: Partial<GardenState> = {
    coupleConnectionLevel: newLevel,
    activeStreakDays: newStreakDays,
    lastSuccessfulInteraction: Timestamp.now(), // Reset to now when watering
    lastWateredBy: userId,
  };

  if (leveledUp && newSlot !== null) {
    newState.pendingFlowerSlot = newSlot;
    newState.pendingFlowerPicker = pendingPicker;
  } else {
    newState.pendingFlowerSlot = currentState.pendingFlowerSlot ?? null;
    newState.pendingFlowerPicker = currentState.pendingFlowerPicker ?? null;
  }

  await updateSharedGardenState(userId, partnerId, newState);
  console.log('[Garden] 💧 [DEV] Watered! Streak:', newStreakDays, '/', 3, 'Level:', newLevel);

  const updatedState: GardenState = {
    ...currentState,
    ...newState,
    lastSuccessfulInteraction: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  return { state: updatedState, leveledUp, newSlot };
}
