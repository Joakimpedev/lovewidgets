/**
 * Garden State Management for LoveWidgets
 * Handles the garden gamification data model and Firestore operations
 * 
 * SHARED GARDEN: Both connected partners see and interact with the SAME garden.
 * The garden is stored under a "connectionId" which is deterministic based on both user IDs.
 */

import { db } from '@/config/firebaseConfig';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { getUserProfileFromFirestore } from './pairing';

// ============================================
// TYPES
// ============================================

import { FlowerVariant } from '@/constants/Assets';
import { FlowerTypeId, getFlowerRadius } from '@/constants/FlowerMarket';

/**
 * Individual flower planted in the garden
 */
export interface PlantedFlower {
  id: string; // Unique ID for this flower
  type: FlowerTypeId; // 'rose', 'tulip', etc.
  variant: FlowerVariant; // 'v1', 'v2', 'v3'
  plantedAt: number; // Timestamp when planted (ms)
  // Position (coordinate-based system for manual placement)
  x?: number; // X coordinate (pixels from left edge) - optional for legacy slot-based flowers
  y?: number; // Y coordinate (pixels from bottom of flower area, 0 = front, positive = back) - optional for legacy slot-based flowers
  // Legacy slot support for backward compatibility (deprecated)
  slot?: number; // Old slot-based system (0-32) - kept for migration
  flipped?: boolean; // Whether the flower is horizontally flipped
}

/**
 * Growth stage based on hours since planting and plant type
 * - Flowers: sapling < 30 minutes, mature >= 30 minutes
 * - Large plants: sapling < 6 hours, mature >= 6 hours
 * - Trees: sapling < 12 hours, mature >= 12 hours
 */
export type GrowthStage = 'sapling' | 'mature';

/**
 * Landmark types for horizon decorations
 */
export type LandmarkTypeId = 'mountain' | 'windmill' | 'cooling_tower';

// ============================================
// COST MAPPINGS FOR REFUND CALCULATION
// ============================================

/**
 * Cost mapping for plants (flowers)
 * These costs must match the costs in app/shop.tsx
 */
export const PLANT_COSTS: Record<FlowerTypeId, number> = {
  rose: 3,
  tulip: 5,
  morning_glory: 7,
  orchid: 10,
  pumpkin: 14,
  watermelon: 12,
  strawberry: 9,
  apple_tree: 20,
};

/**
 * Cost mapping for decor items
 * These costs must match the costs in app/shop.tsx
 */
export const DECOR_COSTS: Record<string, number> = {
  birdbath: 20,
  garden_gnome: 15,
  pink_flamingo: 22,
  pond: 20,
  telescope: 25,
  campfire: 22,
  lawnchair: 18,
};

/**
 * Cost mapping for landmarks
 * These costs must match the costs in app/shop.tsx
 */
export const LANDMARK_COSTS: Record<LandmarkTypeId, number> = {
  mountain: 30,
  windmill: 30,
  cooling_tower: 30,
};

/**
 * Decor types for garden decorations (behave like plants but no sapling stage)
 */
export type DecorTypeId = string; // Will be defined when decor items are added

// ============================================
// DECOR COLLISION RADIUS CONFIGURATION
// ============================================
// Define collision radius for each decor type
// This determines how close other items can be placed to decor items
// 
// Rule: A decor item can be placed if its center point is NOT inside 
// any existing flower/decor's collision radius

export const DECOR_COLLISION_RADIUS: Record<string, number> = {
  birdbath: 20, // Adjust this value to change birdbath collision radius
  garden_gnome: 20, // Adjust this value to change garden gnome collision radius
  pink_flamingo: 15, // Adjust this value to change pink flamingo collision radius
  pond: 40, // Adjust this value to change pond collision radius (larger for wider pond)
  telescope: 25, // Adjust this value to change telescope collision radius
  campfire: 25, // Adjust this value to change campfire collision radius
  lawnchair: 25, // Adjust this value to change lawn chair collision radius
  // Add more decor types here as you add them:
  // fountain: 50,
};

/**
 * Get collision radius for a decor type
 * Returns the radius in pixels
 */
export function getDecorCollisionRadius(decorType: DecorTypeId): number {
  return DECOR_COLLISION_RADIUS[decorType] || 50; // Default to 50px if not specified
}

/**
 * Individual decor item placed in the garden
 * Similar to PlantedFlower but always shows mature stage (no sapling)
 * Decor items have NO variants - just decay states
 */
export interface PlantedDecor {
  id: string; // Unique ID for this decor item
  type: DecorTypeId; // Decor type identifier
  plantedAt: number; // Timestamp when planted (ms)
  // Position (coordinate-based system for manual placement)
  x: number; // X coordinate (pixels from left edge)
  y: number; // Y coordinate (pixels from bottom of flower area, 0 = front, positive = back)
  flipped?: boolean; // Whether the decor item is horizontally flipped
}

/**
 * Individual landmark placed in the garden
 */
export interface PlantedLandmark {
  id: string; // Unique ID for this landmark
  type: LandmarkTypeId; // 'mountain', 'tree_line', etc.
  plantedAt: number; // Timestamp when planted (ms)
  x: number; // X coordinate (pixels from left edge) - center of landmark
  y: number; // Y coordinate (pixels from bottom) - fixed at horizon line
  order?: number; // Optional order for z-index layering (lower = back, higher = front)
  flipped?: boolean; // Whether the landmark is horizontally flipped
}

export interface GardenState {
  coupleConnectionLevel: number; // Min 1 - number of flowers
  activeStreakDays: number; // 0, 1, or 2 - progress toward next flower
  lastSuccessfulInteraction: Timestamp | null; // Last letter/action sent (used as lastWatered)
  lastWateredBy: string | null; // User ID who last watered
  user1Id: string; // First partner
  user2Id: string; // Second partner
  updatedAt: Timestamp | null;
  flowers: PlantedFlower[]; // Individual flowers in the garden
  decor: PlantedDecor[]; // Individual decor items in the garden (behave like plants but no sapling)
  landmarks: PlantedLandmark[]; // Individual landmarks in the garden
  variantCycleIndex: number | null; // Current position in variant cycle (0=v1, 1=v2, 2=v3), null=random next
  wateredByToday: string[]; // Array of userIDs who watered today (resets daily)
  lastWateredByUser: Record<string, Timestamp>; // Map of userId -> last watering timestamp (for 6-hour cooldown)
  pendingHarmonyBonusFor: string[]; // Array of userIDs who should see harmony bonus notification when they open app
  firstPlantFlower: boolean; // True if user has planted their first small flower
  firstPlantLargePlant: boolean; // True if user has planted their first large plant (pumpkin/watermelon)
  firstPlantTree: boolean; // True if user has planted their first tree
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
  decor: [], // Empty array - decor items are purchased items
  landmarks: [], // Empty array - landmarks are purchased items
  variantCycleIndex: null, // null = random first, then cycles 0→1→2→0...
  wateredByToday: [], // Empty array - resets daily
  lastWateredByUser: {}, // Empty object - tracks per-user last watering time
  pendingHarmonyBonusFor: [], // Empty array - tracks users who should see harmony bonus notification
  firstPlantFlower: false, // Track if first small flower has been planted
  firstPlantLargePlant: false, // Track if first large plant has been planted
  firstPlantTree: false, // Track if first tree has been planted
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
    wateredByToday: [], // Initialize empty array
    flowers: [], // Initialize empty flowers array
    decor: [], // Initialize empty decor array
    landmarks: [], // Initialize empty landmarks array
    lastWateredByUser: {}, // Initialize empty object
    pendingHarmonyBonusFor: [], // Initialize empty array
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
          wateredByToday: [], // Initialize empty array
          pendingHarmonyBonusFor: [], // Initialize empty array
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
 * Check if a timestamp is from today (same calendar day)
 */
function isTodayTimestamp(timestamp: Timestamp | null): boolean {
  if (!timestamp) return false;
  
  const date = new Date(timestamp.toMillis());
  const today = new Date();
  
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Check if user can water (6-hour cooldown check)
 * Returns true if user can water, false if too soon
 * 
 * IMPORTANT: Each user's cooldown is independent. User 1 watering does NOT affect User 2's ability to water.
 * Only checks the specific user's lastWateredByUser[userId] timestamp.
 */
export function canUserWater(gardenState: GardenState, userId: string): boolean {
  if (!gardenState) {
    console.log('[canUserWater] No gardenState provided');
    return false;
  }
  
  const lastWateredByUser = gardenState.lastWateredByUser || {};
  const userLastWatered = lastWateredByUser[userId];
  
  // Only check THIS user's last watering time - don't use fallback to lastSuccessfulInteraction
  // because that would incorrectly block user 2 when user 1 waters
  if (userLastWatered) {
    const now = Date.now();
    const lastWateredMs = userLastWatered.toMillis();
    const hoursSinceLastWater = (now - lastWateredMs) / (1000 * 60 * 60);
    
    const canWater = hoursSinceLastWater >= 6;
    console.log('[canUserWater] userId:', userId, 'hoursSinceLastWater:', hoursSinceLastWater.toFixed(2), 'canWater:', canWater);
    return canWater;
  }
  
  // No timestamp for this user - they can water (no cooldown yet)
  console.log('[canUserWater] No lastWateredByUser timestamp for userId:', userId, '- canWater: true (no cooldown)');
  return true;
}

/**
 * Water the shared garden (Roommate Model)
 * 
 * Logic:
 * 1. Check if user.wallet.water > 0, deduct 1
 * 2. Check sharedRoom.garden.wateredByToday
 * 3. If array includes userId, block action (Already watered)
 * 4. If array is empty: First Water - Reset lastWatered timer (Plant is Safe)
 * 5. If array has Partner's ID: Second Water - Trigger 'Harmony Bonus' (Give 1 extra Gold to both users)
 * 6. Push userId to wateredByToday
 */
export async function waterSharedGarden(
  userId: string,
  partnerId: string
): Promise<{ 
  state: GardenState; 
  alreadyWateredToday: boolean;
  tooSoonToWater: boolean; // True if user watered within 6 hours
  harmonyBonus: boolean; // True if harmony bonus was triggered
  streakReward: boolean; // True if 3-day streak reward was given
  isWilted?: boolean; // True if garden is wilted (24+ hours) and cannot be watered normally
}> {
  // Get current shared garden state
  const currentState = await getSharedGardenState(userId, partnerId);

  // Check if garden is wilted (24+ hours since last interaction)
  const status = calculateGardenStatus(currentState);
  if (status.health === 'wilted') {
    return {
      state: currentState,
      alreadyWateredToday: false,
      tooSoonToWater: false,
      harmonyBonus: false,
      streakReward: false,
      isWilted: true,
    };
  }

  // Get user profile to check wallet
  const userProfile = await getUserProfileFromFirestore(userId);
  if (!userProfile) {
    throw new Error('User profile not found');
  }

  const wallet = userProfile.wallet || { gold: 0, water: 0, maxWater: 3 };

  // Check if user has water
  if (wallet.water < 1) {
    throw new Error('Not enough water drops');
  }

  // Initialize wateredByToday and lastWateredByUser if missing (backwards compatibility)
  let wateredByToday = currentState.wateredByToday || [];
  let lastWateredByUser = currentState.lastWateredByUser || {};

  // Reset wateredByToday if lastSuccessfulInteraction is from a different day
  if (currentState.lastSuccessfulInteraction && !isTodayTimestamp(currentState.lastSuccessfulInteraction)) {
    wateredByToday = [];
    console.log('[Garden] 🌅 New day - resetting wateredByToday');
  }

  // NOTE: We trust the UI's canWater check - it already validated the 6-hour cooldown.
  // We don't do a redundant server-side check here because it can cause issues with stale data.
  // The UI uses canUserWater() which has the same logic, so if it passed there, we proceed here.
  const userLastWatered = lastWateredByUser[userId];
  if (!userLastWatered) {
    console.log('[Garden] ⚠️ lastWateredByUser missing for user:', userId, '- proceeding with watering (UI check passed)');
  }

  // Check if user already watered today (for streak purposes)
  // BUT: If 6+ hours have passed (validated by UI's canWater check), allow watering again
  // The 6-hour cooldown takes precedence - if UI says canWater=true, we trust it
  if (wateredByToday.includes(userId)) {
    // If user has lastWateredByUser timestamp, verify 6 hours have passed
    if (userLastWatered) {
      const now = Date.now();
      const lastWateredMs = userLastWatered.toMillis();
      const hoursSinceLastWater = (now - lastWateredMs) / (1000 * 60 * 60);
      
      // If 6+ hours have passed, allow watering again (remove from wateredByToday)
      if (hoursSinceLastWater >= 6) {
        console.log('[Garden] ✅ User can water again after 6+ hours. Removing from wateredByToday.');
        wateredByToday = wateredByToday.filter(id => id !== userId);
      } else {
        // Less than 6 hours - this shouldn't happen if UI check worked, but block just in case
        console.log('[Garden] ⚠️ User in wateredByToday but less than 6 hours - blocking (UI check may have stale data)');
        return {
          state: {
            ...currentState,
            lastWateredByUser: lastWateredByUser,
          },
          alreadyWateredToday: true,
          tooSoonToWater: false,
          harmonyBonus: false,
          streakReward: false,
        };
      }
    } else {
      // No lastWateredByUser timestamp - UI's canWater check passed, so trust it
      // Remove from wateredByToday to allow this new watering
      console.log('[Garden] ✅ No lastWateredByUser but UI check passed - allowing watering. Removing from wateredByToday.');
      wateredByToday = wateredByToday.filter(id => id !== userId);
    }
  }

  // Deduct 1 water from user's wallet (only if checks pass)
  const newWater = wallet.water - 1;
  console.log('[Garden] 💧 Deducting water. Current:', wallet.water, 'New:', newWater);
  await updateDoc(doc(db, 'users', userId), {
    'wallet.water': newWater,
    updatedAt: serverTimestamp(),
  });
  console.log('[Garden] ✅ Water deducted successfully');

  // Determine if this is first water or second water (harmony bonus)
  // Harmony bonus triggers when BOTH users water in the same day
  const isFirstWater = wateredByToday.length === 0;
  const isSecondWater = wateredByToday.length === 1 && wateredByToday.includes(partnerId);
  let harmonyBonus = false;

  console.log('[Garden] Watering check - wateredByToday:', wateredByToday, 'isFirstWater:', isFirstWater, 'isSecondWater:', isSecondWater);

  // Handle harmony bonus (second water - when partner already watered today)
  if (isSecondWater) {
    harmonyBonus = true;
    console.log('[Garden] 🎵 Harmony Bonus triggered! Both users watered today.');
    
    // Get partner's current wallet (fresh read) BEFORE updating
    const partnerProfile = await getUserProfileFromFirestore(partnerId);
    const partnerWallet = partnerProfile?.wallet || { gold: 0, water: 0, maxWater: 3 };
    
    // Ensure wallet structure exists before updating
    const userCurrentGold = wallet.gold || 0;
    const partnerCurrentGold = partnerWallet.gold || 0;
    
    // Give +1 gold to BOTH users
    const userDocRef = doc(db, 'users', userId);
    const partnerDocRef = doc(db, 'users', partnerId);
    
    await updateDoc(userDocRef, {
      'wallet.gold': userCurrentGold + 1,
      updatedAt: serverTimestamp(),
    });
    
    await updateDoc(partnerDocRef, {
      'wallet.gold': partnerCurrentGold + 1,
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Garden] 💰 Harmony Bonus awarded! User:', userId, 'got +1 gold (now:', userCurrentGold + 1, '). Partner:', partnerId, 'got +1 gold (now:', partnerCurrentGold + 1, ')');
  }

  // Update wateredByToday array
  const updatedWateredByToday = [...wateredByToday, userId];

  // Check if this is the first interaction (no flowers planted yet)
  const flowers = currentState.flowers || [];
  const isFirstFlower = flowers.length === 0;

  let newLevel = currentState.coupleConnectionLevel;
  let newStreakDays = currentState.activeStreakDays;

  // Only increment streak if this is the first water of the day (not second)
  let streakReward = false; // Track if 3-day streak reward was given
  if (isFirstWater) {
    newStreakDays = currentState.activeStreakDays + 1;
    
    // 3-day streak reward: Give 5 coins to both users
    if (newStreakDays >= 3) {
      newStreakDays = 0; // Reset streak
      streakReward = true;
      
      // Give 5 coins to both users
      const userDocRef = doc(db, 'users', userId);
      const partnerDocRef = doc(db, 'users', partnerId);
      
      // Get fresh wallet data
      const userProfileFresh = await getUserProfileFromFirestore(userId);
      const partnerProfileFresh = await getUserProfileFromFirestore(partnerId);
      const userWalletFresh = userProfileFresh?.wallet || { gold: 0, water: 0, maxWater: 3 };
      const partnerWalletFresh = partnerProfileFresh?.wallet || { gold: 0, water: 0, maxWater: 3 };
      
      const userCurrentGold = userWalletFresh.gold || 0;
      const partnerCurrentGold = partnerWalletFresh.gold || 0;
      
      await updateDoc(userDocRef, {
        'wallet.gold': userCurrentGold + 5,
        updatedAt: serverTimestamp(),
      });
      
      await updateDoc(partnerDocRef, {
        'wallet.gold': partnerCurrentGold + 5,
        updatedAt: serverTimestamp(),
      });
      
      console.log('[Garden] 🎉 3-Day Streak Reward! Both users received +5 gold');
    }
  }

  // Update lastWateredByUser with current timestamp for THIS user only
  // IMPORTANT: Each user has their own independent 6-hour cooldown.
  // User 1 watering does NOT affect User 2's ability to water.
  const updatedLastWateredByUser = {
    ...lastWateredByUser,
    [userId]: Timestamp.now(), // Only this user gets the 6-hour cooldown
  };

  // Initialize pendingHarmonyBonusFor if missing
  let updatedPendingHarmonyBonusFor = currentState.pendingHarmonyBonusFor || [];
  
  // If harmony bonus was triggered, mark the first waterer (partner) to receive notification when they open the app
  if (harmonyBonus) {
    const partnerInPending = updatedPendingHarmonyBonusFor.includes(partnerId);
    if (!partnerInPending) {
      updatedPendingHarmonyBonusFor = [...updatedPendingHarmonyBonusFor, partnerId];
      console.log('[Garden] 📬 Marked partner', partnerId, 'for harmony bonus notification');
    }
  }

  // Build update object
  const newState: Partial<GardenState> = {
    coupleConnectionLevel: newLevel,
    activeStreakDays: newStreakDays,
    lastSuccessfulInteraction: Timestamp.now(), // Reset garden timer whenever ANY user waters (makes garden fresh)
    lastWateredBy: userId,
    wateredByToday: updatedWateredByToday,
    lastWateredByUser: updatedLastWateredByUser, // Only this user gets 6-hour cooldown, partner is unaffected
    pendingHarmonyBonusFor: updatedPendingHarmonyBonusFor,
  };

  await updateSharedGardenState(userId, partnerId, newState);
  console.log('[Garden] 💧 Watered by', userId, '! Streak:', newStreakDays, '/', 3, 'Level:', newLevel, 'WateredByToday:', updatedWateredByToday.length);
  console.log('[Garden] ✅ Garden state updated. lastWateredByUser:', JSON.stringify(updatedLastWateredByUser));

  const updatedState: GardenState = {
    ...currentState,
    ...newState,
    lastSuccessfulInteraction: Timestamp.now(),
    updatedAt: Timestamp.now(),
    wateredByToday: updatedWateredByToday,
    lastWateredByUser: updatedLastWateredByUser,
    pendingHarmonyBonusFor: updatedPendingHarmonyBonusFor,
  };

  console.log('[Garden] ✅ Returning success. tooSoonToWater: false, alreadyWateredToday: false');

  return { 
    state: updatedState, 
    alreadyWateredToday: false,
    tooSoonToWater: false,
    harmonyBonus,
    streakReward: streakReward || false,
    isWilted: false,
  };
}

/**
 * Revive a wilted garden by paying 10 coins
 * This resets the lastSuccessfulInteraction to now, bringing the garden back to fresh state
 */
export async function reviveWiltedGarden(
  userId: string,
  partnerId: string
): Promise<{ success: boolean; error?: string }> {
  // Get current shared garden state
  const currentState = await getSharedGardenState(userId, partnerId);

  // Verify garden is actually wilted
  const status = calculateGardenStatus(currentState);
  if (status.health !== 'wilted') {
    return {
      success: false,
      error: 'Garden is not wilted',
    };
  }

  // Get user profile to check wallet
  const userProfile = await getUserProfileFromFirestore(userId);
  if (!userProfile) {
    return {
      success: false,
      error: 'User profile not found',
    };
  }

  const wallet = userProfile.wallet || { gold: 0, water: 0, maxWater: 3 };

  // Check if user has enough coins
  if (wallet.gold < 10) {
    return {
      success: false,
      error: 'Not enough coins. Need 10 coins to revive the garden.',
    };
  }

  // Deduct 10 coins
  const newGold = wallet.gold - 10;
  await updateDoc(doc(db, 'users', userId), {
    'wallet.gold': newGold,
    updatedAt: serverTimestamp(),
  });
  console.log('[Garden] 💰 Deducted 10 coins for revival. Remaining:', newGold);

  // Reset lastSuccessfulInteraction to now (revives the garden)
  await updateSharedGardenState(userId, partnerId, {
    lastSuccessfulInteraction: Timestamp.now(),
  });

  console.log('[Garden] 🌱 Garden revived! Reset lastSuccessfulInteraction to now.');

  return { success: true };
}

/**
 * Apply punishment for missing 24 hours
 * Reduces level by 1 (min 1) and resets streak
 * Does NOT reset lastSuccessfulInteraction - garden stays wilted until watered
 * 
 * IMPORTANT: Only applies punishment if level would actually decrease.
 * If level is already at minimum (1), returns current state without updating.
 */
export async function applySharedPunishment(
  userId: string,
  partnerId: string
): Promise<GardenState> {
  const currentState = await getSharedGardenState(userId, partnerId);

  const newLevel = Math.max(1, currentState.coupleConnectionLevel - 1);
  
  // If level is already at minimum and streak is already 0, don't apply punishment again
  // This prevents infinite loops when garden is already punished
  if (newLevel === currentState.coupleConnectionLevel && currentState.activeStreakDays === 0) {
    console.log('[Garden] ⚠️ Punishment already applied - level at minimum and streak already reset. Skipping.');
    return currentState;
  }
  
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
 * 
 * Decay stages:
 * - Fresh: 0-12 hours
 * - Wilting: 12-24 hours
 * - Wilted: 24+ hours (cannot water to revive, must pay coins or watch ad)
 */
export function calculateGardenStatus(state: GardenState): GardenStatus {
  const now = Date.now();
  const lastInteraction = state.lastSuccessfulInteraction?.toMillis() || now;
  const hoursSinceInteraction = (now - lastInteraction) / (1000 * 60 * 60);

  let health: FlowerHealth;
  if (hoursSinceInteraction < 12) {
    health = 'fresh';
  } else if (hoursSinceInteraction < 24) {
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
 * Get plant category (flower, large plant, or tree)
 */
export function getPlantCategory(type: FlowerTypeId): 'flower' | 'largeplant' | 'tree' {
  // Large plants
  if (type === 'pumpkin' || type === 'watermelon') {
    return 'largeplant';
  }
  // Trees
  if (type === 'apple_tree') {
    return 'tree';
  }
  // Everything else is a flower
  return 'flower';
}

/**
 * Calculate growth stage based on hours since planting and plant type
 * - Flowers: < 30 minutes: sapling, >= 30 minutes: mature
 * - Large plants: < 6 hours: sapling, >= 6 hours: mature
 * - Trees: < 12 hours: sapling, >= 12 hours: mature
 */
export function getGrowthStage(plantedAt: number, type: FlowerTypeId): GrowthStage {
  const now = Date.now();
  const category = getPlantCategory(type);
  
  let thresholdHours: number;
  if (category === 'flower') {
    thresholdHours = 0.5; // 30 minutes
  } else if (category === 'largeplant') {
    thresholdHours = 6; // 6 hours
  } else {
    thresholdHours = 12; // 12 hours for trees
  }
  
  const hoursSincePlanting = (now - plantedAt) / (1000 * 60 * 60);
  
  if (hoursSincePlanting < thresholdHours) {
    return 'sapling';
  } else {
    return 'mature';
  }
}

/**
 * Get growth stage for decor items
 * Decor items always show as mature (no sapling stage)
 */
export function getDecorGrowthStage(): GrowthStage {
  return 'mature'; // Decor items always show immediately, no sapling stage
}

/**
 * Get the scale factor for a flower based on growth stage
 */
export function getGrowthScale(stage: GrowthStage): number {
  switch (stage) {
    case 'sapling':
      return 0.7; // Sapling is smaller
    case 'mature':
      return 1.0; // Full size
  }
}

/**
 * Find an available slot for a new flower
 * Uses spread-out logic: flowers spawn across available width
 * First 10 flowers are constrained to 80% of screen width (not at edges)
 */
const TOTAL_SLOTS = 33; // Total slots available

function findAvailableSlot(flowers: PlantedFlower[]): number {
  const usedSlots = new Set(flowers.map(f => f.slot));
  const flowerCount = flowers.length;
  
  // Define slot range based on flower count
  let minApprovedSlot: number;
  let maxApprovedSlot: number;
  
  // First 10 flowers: constrain to inner 80% of screen width
  // Exclude 10% on each side: slots 0-2 (left edge) and 30-32 (right edge)
  // Use slots 3-29 (27 slots = ~82% of width, close to 80%)
  if (flowerCount < 10) {
    minApprovedSlot = 3;  // Exclude first ~10% of slots (0-2)
    maxApprovedSlot = 29; // Exclude last ~10% of slots (30-32)
  } else {
    // After first 10, allow full width (all slots)
    minApprovedSlot = 0;
    maxApprovedSlot = TOTAL_SLOTS - 1;
  }
  
  // Collect all available slots within approved range
  const availableSlots: number[] = [];
  for (let i = minApprovedSlot; i <= maxApprovedSlot; i++) {
    if (!usedSlots.has(i)) {
      availableSlots.push(i);
    }
  }
  
  // If no slots available in approved range, expand search to all slots
  if (availableSlots.length === 0) {
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (!usedSlots.has(i)) {
        availableSlots.push(i);
      }
    }
  }
  
  // Randomly select from available slots
  if (availableSlots.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableSlots.length);
    return availableSlots[randomIndex];
  }
  
  // Fallback: return next slot number if all slots are taken
  return flowers.length;
}

/**
 * Check if a position is valid (no collision with existing flowers)
 * Returns true if position is valid, false if there's a collision
 * 
 * Rule: A flower can be placed if its center point is NOT inside any existing flower's radius
 */
// ============================================
// COLLISION RADIUS MULTIPLIERS (Dev Tuning)
// ============================================
// Adjust collision zone radius multipliers per plant type
// These multipliers are applied to the base reduced radius
// 
// Category definitions for grouping similar plants
const FLOWER_CATEGORIES_FOR_COLLISION = {
  flowers: ['rose', 'tulip', 'morning_glory', 'orchid', 'strawberry'] as FlowerTypeId[],
  largePlants: ['pumpkin', 'watermelon'] as FlowerTypeId[],
  trees: ['apple_tree'] as FlowerTypeId[],
} as const;

const DEFAULT_COLLISION_MULTIPLIERS = {
  flowers: 1.0,
  largePlants: 1.0,
  trees: 0.6,
} as const;

// Individual overrides (only specify when different from category default)
const COLLISION_RADIUS_OVERRIDES: Partial<Record<FlowerTypeId, number>> = {
  // Example: apple_tree: 1.2, // Make apple_tree collision zone 20% larger
  // Example: pumpkin: 0.9, // Make pumpkin collision zone 10% smaller
};

function getFlowerCategoryForCollision(type: FlowerTypeId): keyof typeof DEFAULT_COLLISION_MULTIPLIERS {
  if (FLOWER_CATEGORIES_FOR_COLLISION.flowers.includes(type)) return 'flowers';
  if (FLOWER_CATEGORIES_FOR_COLLISION.largePlants.includes(type)) return 'largePlants';
  if (FLOWER_CATEGORIES_FOR_COLLISION.trees.includes(type)) return 'trees';
  return 'flowers';
}

// Generate collision multipliers from defaults and overrides
export const COLLISION_RADIUS_MULTIPLIERS: Record<FlowerTypeId, number> = 
  Object.fromEntries(
    (['rose', 'tulip', 'morning_glory', 'pumpkin', 'apple_tree', 'watermelon', 'orchid', 'strawberry'] as FlowerTypeId[]).map(type => {
      const category = getFlowerCategoryForCollision(type);
      const defaultMultiplier = DEFAULT_COLLISION_MULTIPLIERS[category];
      const override = COLLISION_RADIUS_OVERRIDES[type];
      return [type, override !== undefined ? override : defaultMultiplier];
    })
  ) as Record<FlowerTypeId, number>;

/**
 * Calculate the reduced radius for collision detection (matches visual display)
 * This MUST match the exact same logic used in Garden.tsx for rendering collision zones
 */
export function getReducedCollisionRadius(flowerType: FlowerTypeId): number {
  let baseRadius = getFlowerRadius(flowerType);
  
  // For apple_tree, first decrease by 1/3
  if (flowerType === 'apple_tree') {
    baseRadius = baseRadius * (2 / 3);
  }
  
  // Then decrease everything by 1/2 (including tree)
  return baseRadius * (1 / 2);
}

export function canPlaceFlower(
  flowers: PlantedFlower[],
  newFlowerType: FlowerTypeId,
  newX: number,
  newY: number,
  decor?: PlantedDecor[] // Optional decor array to check against
): { valid: boolean; reason?: string } {
  // CRITICAL: newX is center X, newY is bottom Y
  // This represents the bottom-middle point of the sapling (where stem hits ground)
  // This is the ONLY point that should be checked against collision zones
  
  // Get the new flower's collision radius
  const baseReducedRadius = getReducedCollisionRadius(newFlowerType);
  const multiplier = COLLISION_RADIUS_MULTIPLIERS[newFlowerType] || 1.0;
  const newFlowerRadius = baseReducedRadius * multiplier;
  
  // Check against existing flowers
  for (const flower of flowers) {
    // Skip if flower doesn't have coordinates (backward compatibility)
    if (flower.x === undefined || flower.y === undefined) {
      continue; // Can't check collision with slot-based flowers yet
    }
    
    // Get the EXACT same reduced radius used for visual collision zones
    const baseReducedRadius = getReducedCollisionRadius(flower.type);
    // Apply collision radius multiplier for fine-tuning (matches visual display)
    const multiplier = COLLISION_RADIUS_MULTIPLIERS[flower.type] || 1.0;
    const reducedRadius = baseReducedRadius * multiplier;
    
    // flower.x is center X, flower.y is bottom Y (bottom-middle point of existing flower)
    // newX is center X, newY is bottom Y (bottom-middle point of new sapling)
    // Calculate Euclidean distance between these two bottom-middle points
    const dx = newX - flower.x;
    const dy = newY - flower.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if new sapling's bottom-middle point is too close to existing flower
    // Use average of both radii for collision check
    if (distance < (newFlowerRadius + reducedRadius) / 2) {
      return {
        valid: false,
        reason: `Too close to existing ${flower.type}`,
      };
    }
  }
  
  // Check against existing decor
  if (decor && decor.length > 0) {
    for (const decorItem of decor) {
      if (decorItem.x === undefined || decorItem.y === undefined) {
        continue;
      }
      
      const decorRadius = getDecorCollisionRadius(decorItem.type);
      const dx = newX - decorItem.x;
      const dy = newY - decorItem.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if new flower's center is too close to existing decor's center
      // Use average of both radii for collision check
      if (distance < (newFlowerRadius + decorRadius) / 2) {
        return {
          valid: false,
          reason: `Too close to existing decor`,
        };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Check if a decor item can be placed at a specific position
 * Checks collisions against both flowers and other decor items
 */
export function canPlaceDecor(
  flowers: PlantedFlower[],
  decor: PlantedDecor[],
  newDecorType: DecorTypeId,
  newX: number,
  newY: number
): { valid: boolean; reason?: string } {
  // CRITICAL: newX is center X, newY is bottom Y
  // This represents the bottom-middle point of the decor item
  
  // Get the new decor's collision radius
  const newDecorRadius = getDecorCollisionRadius(newDecorType);
  
  // Check against existing flowers
  for (const flower of flowers) {
    // Skip if flower doesn't have coordinates (backward compatibility)
    if (flower.x === undefined || flower.y === undefined) {
      continue;
    }
    
    // Get flower's collision radius
    const baseReducedRadius = getReducedCollisionRadius(flower.type);
    const multiplier = COLLISION_RADIUS_MULTIPLIERS[flower.type] || 1.0;
    const flowerRadius = baseReducedRadius * multiplier;
    
    // Calculate distance between centers
    const dx = newX - flower.x;
    const dy = newY - flower.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if new decor's center is too close to existing flower's center
    // Use average of both radii for collision check
    if (distance < (newDecorRadius + flowerRadius) / 2) {
      return {
        valid: false,
        reason: `Too close to existing ${flower.type}`,
      };
    }
  }
  
  // Check against existing decor
  for (const existingDecor of decor) {
    if (existingDecor.x === undefined || existingDecor.y === undefined) {
      continue;
    }
    
    const existingDecorRadius = getDecorCollisionRadius(existingDecor.type);
    const dx = newX - existingDecor.x;
    const dy = newY - existingDecor.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if new decor's center is too close to existing decor's center
    // Use average of both radii for collision check
    if (distance < (newDecorRadius + existingDecorRadius) / 2) {
      return {
        valid: false,
        reason: 'Too close to existing decor',
      };
    }
  }
  
  return { valid: true };
}

/**
 * Plant a flower in the garden at a specific coordinate
 * Variant follows a cycle: random first, then v1 → v2 → v3 → v1...
 * Cycle resets to random when a flower is removed (decay)
 */
export async function plantFlowerAtPosition(
  userId: string,
  partnerId: string,
  flowerType: FlowerTypeId,
  x: number,
  y: number,
  flipped?: boolean
): Promise<{ success: boolean; error?: string; isFirstPlant?: 'flower' | 'largeplant' | 'tree' }> {
  const state = await getSharedGardenState(userId, partnerId);
  const flowers = state.flowers || [];
  const decor = state.decor || [];
  
  // Check for collisions (including decor)
  const validation = canPlaceFlower(flowers, flowerType, x, y, decor);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.reason || 'Cannot place flower here',
    };
  }
  
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
    id: `flower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: flowerType,
    variant,
    plantedAt: Date.now(),
    x,
    y,
    flipped: flipped || false,
  };
  
  const updatedFlowers = [...flowers, newFlower];
  
  // Check if this is a first plant of this category
  const category = getPlantCategory(flowerType);
  let isFirstPlant: 'flower' | 'largeplant' | 'tree' | undefined = undefined;
  const updates: Partial<GardenState> = {
    flowers: updatedFlowers,
    variantCycleIndex: nextCycleIndex, // Move to next in cycle
  };
  
  if (category === 'flower' && !state.firstPlantFlower) {
    updates.firstPlantFlower = true;
    isFirstPlant = 'flower';
  } else if (category === 'largeplant' && !state.firstPlantLargePlant) {
    updates.firstPlantLargePlant = true;
    isFirstPlant = 'largeplant';
  } else if (category === 'tree' && !state.firstPlantTree) {
    updates.firstPlantTree = true;
    isFirstPlant = 'tree';
  }
  
  await updateSharedGardenState(userId, partnerId, updates);
  
  console.log('[Garden] 🌱 Planted', flowerType, variant, 'at position', x, y, isFirstPlant ? `(First ${category}!)` : '');
  
  return { success: true, isFirstPlant };
}

/**
 * Plant a decor item at a specific position
 * Decor items behave like plants but always show mature stage (no sapling)
 * Uses same collision detection as flowers
 */
export async function plantDecorAtPosition(
  userId: string,
  partnerId: string,
  decorType: DecorTypeId,
  x: number,
  y: number,
  flipped?: boolean
): Promise<{ success: boolean; error?: string }> {
  const state = await getSharedGardenState(userId, partnerId);
  const decor = state.decor || [];
  const flowers = state.flowers || [];
  
  // Use the same validation function as the UI for consistency
  const validation = canPlaceDecor(flowers, decor, decorType, x, y);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.reason || 'Cannot place decor here',
    };
  }
  
  // Decor items don't have variants - just create the decor item
  const newDecor: PlantedDecor = {
    id: `decor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: decorType,
    plantedAt: Date.now(),
    x,
    y,
    flipped: flipped || false,
  };
  
  const updatedDecor = [...decor, newDecor];
  
  await updateSharedGardenState(userId, partnerId, {
    decor: updatedDecor,
  });
  
  console.log('[Garden] 🎨 Planted decor', decorType, 'at position', x, y);
  
  return { success: true };
}

/**
 * Plant a landmark at a specific position (horizon line)
 * Landmarks are positioned behind the fence, at the horizon line
 * No collision detection - landmarks stack on top of each other
 */
export async function plantLandmarkAtPosition(
  userId: string,
  partnerId: string,
  landmarkType: LandmarkTypeId,
  x: number,
  y: number, // Fixed Y position at horizon line
  flipped?: boolean
): Promise<{ success: boolean; error?: string }> {
  const state = await getSharedGardenState(userId, partnerId);
  const landmarks = state.landmarks || [];
  
  const newLandmark: PlantedLandmark = {
    id: `landmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: landmarkType,
    plantedAt: Date.now(),
    x,
    y, // Fixed at horizon line
    flipped: flipped || false,
  };
  
  const updatedLandmarks = [...landmarks, newLandmark];
  
  await updateSharedGardenState(userId, partnerId, {
    landmarks: updatedLandmarks,
  });
  
  console.log('[Garden] 🏔️ Planted landmark', landmarkType, 'at position', x, y);
  
  return { success: true };
}

/**
 * Update a landmark's position
 */
export async function updateLandmarkPosition(
  userId: string,
  partnerId: string,
  landmarkId: string,
  newX: number,
  newY: number
): Promise<{ success: boolean; error?: string }> {
  const state = await getSharedGardenState(userId, partnerId);
  const landmarks = state.landmarks || [];
  
  const landmarkIndex = landmarks.findIndex(l => l.id === landmarkId);
  if (landmarkIndex === -1) {
    return { success: false, error: 'Landmark not found' };
  }
  
  const updatedLandmarks = [...landmarks];
  updatedLandmarks[landmarkIndex] = {
    ...updatedLandmarks[landmarkIndex],
    x: newX,
    y: newY,
  };
  
  await updateSharedGardenState(userId, partnerId, {
    landmarks: updatedLandmarks,
  });
  
  console.log('[Garden] ✏️ Updated landmark', landmarkId, 'to position', newX, newY);
  
  return { success: true };
}

/**
 * Delete a landmark
 */
export async function deleteLandmark(
  userId: string,
  partnerId: string,
  landmarkId: string
): Promise<{ success: boolean; error?: string }> {
  const state = await getSharedGardenState(userId, partnerId);
  const landmarks = state.landmarks || [];
  
  const updatedLandmarks = landmarks.filter(l => l.id !== landmarkId);
  
  await updateSharedGardenState(userId, partnerId, {
    landmarks: updatedLandmarks,
  });
  
  console.log('[Garden] 🗑️ Deleted landmark', landmarkId);
  
  return { success: true };
}

/**
 * Move a landmark to the front (highest z-index)
 */
export async function moveLandmarkToFront(
  userId: string,
  partnerId: string,
  landmarkId: string
): Promise<{ success: boolean; error?: string }> {
  const state = await getSharedGardenState(userId, partnerId);
  const landmarks = state.landmarks || [];
  
  const landmarkIndex = landmarks.findIndex(l => l.id === landmarkId);
  if (landmarkIndex === -1) {
    return { success: false, error: 'Landmark not found' };
  }
  
  // Find the maximum order value (or use array length if no orders set)
  const maxOrder = landmarks.reduce((max, l) => {
    const order = l.order ?? 0;
    return Math.max(max, order);
  }, landmarks.length);
  
  const updatedLandmarks = [...landmarks];
  updatedLandmarks[landmarkIndex] = {
    ...updatedLandmarks[landmarkIndex],
    order: maxOrder + 1, // Place at front
  };
  
  await updateSharedGardenState(userId, partnerId, {
    landmarks: updatedLandmarks,
  });
  
  console.log('[Garden] ⬆️ Moved landmark', landmarkId, 'to front (order:', maxOrder + 1, ')');
  
  return { success: true };
}

/**
 * Move a landmark to the back (lowest z-index)
 */
export async function moveLandmarkToBack(
  userId: string,
  partnerId: string,
  landmarkId: string
): Promise<{ success: boolean; error?: string }> {
  const state = await getSharedGardenState(userId, partnerId);
  const landmarks = state.landmarks || [];
  
  const landmarkIndex = landmarks.findIndex(l => l.id === landmarkId);
  if (landmarkIndex === -1) {
    return { success: false, error: 'Landmark not found' };
  }
  
  // Find the minimum order value (or use 0 if no orders set)
  const minOrder = landmarks.reduce((min, l) => {
    const order = l.order ?? 0;
    return Math.min(min, order);
  }, 0);
  
  const updatedLandmarks = [...landmarks];
  updatedLandmarks[landmarkIndex] = {
    ...updatedLandmarks[landmarkIndex],
    order: minOrder - 1, // Place at back
  };
  
  await updateSharedGardenState(userId, partnerId, {
    landmarks: updatedLandmarks,
  });
  
  console.log('[Garden] ⬇️ Moved landmark', landmarkId, 'to back (order:', minOrder - 1, ')');
  
  return { success: true };
}

/**
 * Plant a flower in the garden (after level up selection) - LEGACY SLOT-BASED
 * Slot is randomized from available slots
 * Variant follows a cycle: random first, then v1 → v2 → v3 → v1...
 * Cycle resets to random when a flower is removed (decay)
 * 
 * @deprecated Use plantFlowerAtPosition for manual placement
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
  
  // For backward compatibility, convert slot to approximate coordinates
  // This is a temporary bridge - existing slot-based flowers will be migrated
  const newFlower: PlantedFlower = {
    id: `flower_${Date.now()}_${slot}`,
    type: flowerType,
    variant,
    plantedAt: Date.now(),
    slot, // Keep slot for backward compatibility
    // TODO: Convert slot to x,y coordinates for migration
  };
  
  const updatedFlowers = [...flowers, newFlower];
  
  await updateSharedGardenState(userId, partnerId, {
    flowers: updatedFlowers,
    variantCycleIndex: nextCycleIndex, // Move to next in cycle
  });
  
  console.log('[Garden] 🌱 Planted', flowerType, variant, 'in slot', slot);
}

/**
 * DEV TOOL: Remove the most recently planted flower
 */
export async function devRemoveLastFlower(
  userId: string,
  partnerId: string
): Promise<void> {
  const state = await getSharedGardenState(userId, partnerId);
  const flowers = state.flowers || [];
  
  if (flowers.length === 0) {
    console.log('[Garden Dev] No flowers to remove');
    return;
  }
  
  // Sort by plantedAt descending (newest first) and remove the newest one
  const sortedFlowers = [...flowers].sort((a, b) => b.plantedAt - a.plantedAt);
  const removedFlower = sortedFlowers.shift();
  const updatedFlowers = sortedFlowers;
  
  // Update level to match flower count
  const newLevel = Math.max(1, updatedFlowers.length);
  
  await updateSharedGardenState(userId, partnerId, {
    flowers: updatedFlowers,
    coupleConnectionLevel: newLevel,
    variantCycleIndex: null, // Reset variant cycle when flower is removed
  });
  
  console.log('[Garden Dev] 🗑️ Removed flower:', removedFlower?.type, 'from slot', removedFlower?.slot);
}

/**
 * DEV TOOL: Add a rose flower directly (bypasses level up system)
 */
export async function devAddRose(
  userId: string,
  partnerId: string
): Promise<void> {
  const state = await getSharedGardenState(userId, partnerId);
  const flowers = state.flowers || [];
  
  // Use the same planting logic but force rose type
  const slot = findAvailableSlot(flowers);
  
  // Determine variant using cycle
  const allVariants: FlowerVariant[] = ['v1', 'v2', 'v3'];
  let variant: FlowerVariant;
  let nextCycleIndex: number;
  
  if (state.variantCycleIndex === null || state.variantCycleIndex === undefined) {
    // Cycle is reset - pick random
    const randomIndex = Math.floor(Math.random() * allVariants.length);
    variant = allVariants[randomIndex];
    nextCycleIndex = (randomIndex + 1) % 3;
  } else {
    // Continue the cycle
    variant = allVariants[state.variantCycleIndex];
    nextCycleIndex = (state.variantCycleIndex + 1) % 3;
  }
  
  const newFlower: PlantedFlower = {
    id: `flower_${Date.now()}_${slot}`,
    type: 'rose',
    variant,
    plantedAt: Date.now(),
    slot,
  };
  
  const updatedFlowers = [...flowers, newFlower];
  const newLevel = updatedFlowers.length;
  
  await updateSharedGardenState(userId, partnerId, {
    flowers: updatedFlowers,
    coupleConnectionLevel: newLevel,
    variantCycleIndex: nextCycleIndex,
  });
  
  console.log('[Garden Dev] 🌹 Added rose', variant, 'in slot', slot);
}

/**
 * DEV TOOL: Remove all flowers and decor
 */
export async function devRemoveAllFlowers(
  userId: string,
  partnerId: string
): Promise<void> {
  await updateSharedGardenState(userId, partnerId, {
    flowers: [],
    decor: [],
    coupleConnectionLevel: 1,
    variantCycleIndex: null,
  });
  
  console.log('[Garden Dev] 🗑️ Removed all flowers and decor');
}

/**
 * DEV TOOL: Remove all landmarks
 */
export async function devRemoveAllLandmarks(
  userId: string,
  partnerId: string
): Promise<void> {
  await updateSharedGardenState(userId, partnerId, {
    landmarks: [],
  });
  
  console.log('[Garden Dev] 🗑️ Removed all landmarks');
}

/**
 * Remove all landmarks and refund 60% of their cost
 */
export async function removeAllLandmarksWithRefund(
  userId: string,
  partnerId: string
): Promise<{ refundAmount: number }> {
  const state = await getSharedGardenState(userId, partnerId);
  const landmarks = state.landmarks || [];
  
  if (landmarks.length === 0) {
    console.log('[Garden] No landmarks to remove');
    return { refundAmount: 0 };
  }
  
  // Calculate total refund (60% of original cost)
  let totalRefund = 0;
  for (const landmark of landmarks) {
    const cost = LANDMARK_COSTS[landmark.type] || 0;
    totalRefund += Math.floor(cost * 0.6);
  }
  
  // Remove all landmarks
  await updateSharedGardenState(userId, partnerId, {
    landmarks: [],
  });
  
  // Give refund to both users
  if (totalRefund > 0) {
    const userDocRef = doc(db, 'users', userId);
    const partnerDocRef = doc(db, 'users', partnerId);
    
    // Get fresh wallet data
    const userProfileFresh = await getUserProfileFromFirestore(userId);
    const partnerProfileFresh = await getUserProfileFromFirestore(partnerId);
    const userWalletFresh = userProfileFresh?.wallet || { gold: 0, water: 0, maxWater: 3 };
    const partnerWalletFresh = partnerProfileFresh?.wallet || { gold: 0, water: 0, maxWater: 3 };
    
    const userCurrentGold = userWalletFresh.gold || 0;
    const partnerCurrentGold = partnerWalletFresh.gold || 0;
    
    await updateDoc(userDocRef, {
      'wallet.gold': userCurrentGold + totalRefund,
      updatedAt: serverTimestamp(),
    });
    
    await updateDoc(partnerDocRef, {
      'wallet.gold': partnerCurrentGold + totalRefund,
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Garden] 💰 Removed all landmarks and refunded', totalRefund, 'gold to both users (60% of cost)');
  }
  
  return { refundAmount: totalRefund };
}

/**
 * Remove all garden items (flowers + decor) and refund 60% of their cost
 */
export async function removeAllGardenItemsWithRefund(
  userId: string,
  partnerId: string
): Promise<{ refundAmount: number }> {
  const state = await getSharedGardenState(userId, partnerId);
  const flowers = state.flowers || [];
  const decor = state.decor || [];
  
  if (flowers.length === 0 && decor.length === 0) {
    console.log('[Garden] No garden items to remove');
    return { refundAmount: 0 };
  }
  
  // Calculate total refund (60% of original cost)
  let totalRefund = 0;
  
  // Calculate refund for flowers
  for (const flower of flowers) {
    const cost = PLANT_COSTS[flower.type] || 0;
    totalRefund += Math.floor(cost * 0.6);
  }
  
  // Calculate refund for decor
  for (const decorItem of decor) {
    const cost = DECOR_COSTS[decorItem.type] || 0;
    totalRefund += Math.floor(cost * 0.6);
  }
  
  // Remove all garden items and reset level
  await updateSharedGardenState(userId, partnerId, {
    flowers: [],
    decor: [],
    coupleConnectionLevel: 1, // Reset to level 1 when all items are removed
    variantCycleIndex: null, // Reset variant cycle
  });
  
  // Give refund to both users
  if (totalRefund > 0) {
    const userDocRef = doc(db, 'users', userId);
    const partnerDocRef = doc(db, 'users', partnerId);
    
    // Get fresh wallet data
    const userProfileFresh = await getUserProfileFromFirestore(userId);
    const partnerProfileFresh = await getUserProfileFromFirestore(partnerId);
    const userWalletFresh = userProfileFresh?.wallet || { gold: 0, water: 0, maxWater: 3 };
    const partnerWalletFresh = partnerProfileFresh?.wallet || { gold: 0, water: 0, maxWater: 3 };
    
    const userCurrentGold = userWalletFresh.gold || 0;
    const partnerCurrentGold = partnerWalletFresh.gold || 0;
    
    await updateDoc(userDocRef, {
      'wallet.gold': userCurrentGold + totalRefund,
      updatedAt: serverTimestamp(),
    });
    
    await updateDoc(partnerDocRef, {
      'wallet.gold': partnerCurrentGold + totalRefund,
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Garden] 💰 Removed all garden items and refunded', totalRefund, 'gold to both users (60% of cost)');
  }
  
  return { refundAmount: totalRefund };
}

/**
 * Remove all plants (flowers) and refund 60% of their cost
 */
export async function removeAllPlantsWithRefund(
  userId: string,
  partnerId: string
): Promise<{ refundAmount: number }> {
  const state = await getSharedGardenState(userId, partnerId);
  const flowers = state.flowers || [];
  
  if (flowers.length === 0) {
    console.log('[Garden] No plants to remove');
    return { refundAmount: 0 };
  }
  
  // Calculate total refund (60% of original cost)
  let totalRefund = 0;
  for (const flower of flowers) {
    const cost = PLANT_COSTS[flower.type] || 0;
    totalRefund += Math.floor(cost * 0.6);
  }
  
  // Remove all flowers and update level
  const newLevel = Math.max(1, (state.decor?.length || 0) > 0 ? state.coupleConnectionLevel : 1);
  
  await updateSharedGardenState(userId, partnerId, {
    flowers: [],
    coupleConnectionLevel: newLevel,
    variantCycleIndex: null, // Reset variant cycle
  });
  
  // Give refund to both users
  if (totalRefund > 0) {
    const userDocRef = doc(db, 'users', userId);
    const partnerDocRef = doc(db, 'users', partnerId);
    
    // Get fresh wallet data
    const userProfileFresh = await getUserProfileFromFirestore(userId);
    const partnerProfileFresh = await getUserProfileFromFirestore(partnerId);
    const userWalletFresh = userProfileFresh?.wallet || { gold: 0, water: 0, maxWater: 3 };
    const partnerWalletFresh = partnerProfileFresh?.wallet || { gold: 0, water: 0, maxWater: 3 };
    
    const userCurrentGold = userWalletFresh.gold || 0;
    const partnerCurrentGold = partnerWalletFresh.gold || 0;
    
    await updateDoc(userDocRef, {
      'wallet.gold': userCurrentGold + totalRefund,
      updatedAt: serverTimestamp(),
    });
    
    await updateDoc(partnerDocRef, {
      'wallet.gold': partnerCurrentGold + totalRefund,
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Garden] 💰 Removed all plants and refunded', totalRefund, 'gold to both users (60% of cost)');
  }
  
  return { refundAmount: totalRefund };
}

/**
 * Remove all decor items and refund 60% of their cost
 */
export async function removeAllDecorWithRefund(
  userId: string,
  partnerId: string
): Promise<{ refundAmount: number }> {
  const state = await getSharedGardenState(userId, partnerId);
  const decor = state.decor || [];
  
  if (decor.length === 0) {
    console.log('[Garden] No decor items to remove');
    return { refundAmount: 0 };
  }
  
  // Calculate total refund (60% of original cost)
  let totalRefund = 0;
  for (const decorItem of decor) {
    const cost = DECOR_COSTS[decorItem.type] || 0;
    totalRefund += Math.floor(cost * 0.6);
  }
  
  // Remove all decor items
  await updateSharedGardenState(userId, partnerId, {
    decor: [],
  });
  
  // Give refund to both users
  if (totalRefund > 0) {
    const userDocRef = doc(db, 'users', userId);
    const partnerDocRef = doc(db, 'users', partnerId);
    
    // Get fresh wallet data
    const userProfileFresh = await getUserProfileFromFirestore(userId);
    const partnerProfileFresh = await getUserProfileFromFirestore(partnerId);
    const userWalletFresh = userProfileFresh?.wallet || { gold: 0, water: 0, maxWater: 3 };
    const partnerWalletFresh = partnerProfileFresh?.wallet || { gold: 0, water: 0, maxWater: 3 };
    
    const userCurrentGold = userWalletFresh.gold || 0;
    const partnerCurrentGold = partnerWalletFresh.gold || 0;
    
    await updateDoc(userDocRef, {
      'wallet.gold': userCurrentGold + totalRefund,
      updatedAt: serverTimestamp(),
    });
    
    await updateDoc(partnerDocRef, {
      'wallet.gold': partnerCurrentGold + totalRefund,
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Garden] 💰 Removed all decor items and refunded', totalRefund, 'gold to both users (60% of cost)');
  }
  
  return { refundAmount: totalRefund };
}

