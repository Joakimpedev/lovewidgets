/**
 * Garden Economy Logic for LoveWidgets
 * Resource-Based Economy: Water Drops (soft currency) and Gold (hard currency)
 * 
 * The Economy:
 * - Water Drops: Used to keep the plant alive/growing. Earned daily when sending doodles/notes.
 * - Gold: Used to buy new plant types/skins. Earned at streak milestones.
 * 
 * The Daily Loop:
 * - When user sends a Doodle/Note, check lastWaterEarned
 * - If it's a new UTC day AND currentWater < maxWater, give +1 Water Drop
 * 
 * The Care Loop:
 * - Plant has a lastWatered timestamp. If > 24h, it wilts.
 * - User must manually tap 'Watering Can' button to spend 1 Water Drop.
 * - Result: Resets 24h timer and increments streakDays counter.
 * 
 * The Reward Loop:
 * - If streakDays hits milestones (e.g., 3 days), the user earns Gold (e.g., +100).
 */

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import { UserProfile } from './pairing';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_MAX_WATER = 3;
const STREAK_MILESTONE_DAYS = 3; // Days needed to earn gold
const STREAK_GOLD_REWARD = 100; // Gold earned at milestone
const WILT_THRESHOLD_HOURS = 24; // Hours before plant wilts

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize wallet to ensure maxWater is capped at 3 and water is capped at maxWater
 */
function normalizeWallet(wallet: { gold: number; water: number; maxWater: number }): { gold: number; water: number; maxWater: number } {
  const normalizedMaxWater = Math.min(wallet.maxWater, DEFAULT_MAX_WATER); // Cap at 3
  const normalizedWater = Math.min(wallet.water, normalizedMaxWater); // Cap water at maxWater
  return {
    ...wallet,
    water: normalizedWater,
    maxWater: normalizedMaxWater,
  };
}

/**
 * Get default wallet structure if missing (backwards compatibility)
 */
function getDefaultWallet() {
  return {
    gold: 0,
    water: 0,
    maxWater: DEFAULT_MAX_WATER,
  };
}

/**
 * Get default garden structure if missing (backwards compatibility)
 */
function getDefaultGarden() {
  return {
    currentPlantId: null,
    isWilted: false,
    streakDays: 0,
    lastWatered: null,
    lastWaterEarned: null,
  };
}

/**
 * Check if two timestamps are from the same UTC day
 */
function isSameUTCDay(timestamp1: Timestamp | null, timestamp2: Timestamp | null): boolean {
  if (!timestamp1 || !timestamp2) return false;
  
  const date1 = timestamp1.toDate();
  const date2 = timestamp2.toDate();
  
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Check if a timestamp is from today (UTC)
 */
function isTodayUTC(timestamp: Timestamp | null): boolean {
  if (!timestamp) return false;
  
  const date = timestamp.toDate();
  const today = new Date();
  
  return (
    date.getUTCFullYear() === today.getUTCFullYear() &&
    date.getUTCMonth() === today.getUTCMonth() &&
    date.getUTCDate() === today.getUTCDate()
  );
}

/**
 * Check if plant is wilted based on lastWatered timestamp
 */
function calculateIsWilted(lastWatered: Timestamp | null): boolean {
  if (!lastWatered) return true; // Never watered = wilted
  
  const now = Date.now();
  const lastWateredMs = lastWatered.toMillis();
  const hoursSinceWatered = (now - lastWateredMs) / (1000 * 60 * 60);
  
  return hoursSinceWatered >= WILT_THRESHOLD_HOURS;
}

// ============================================
// WATER EARNING LOGIC
// ============================================

/**
 * Check if user can earn water (new UTC day AND water below cap)
 */
export function canEarnWater(user: UserProfile): boolean {
  const wallet = normalizeWallet(user.wallet || getDefaultWallet());
  const garden = user.garden || getDefaultGarden();
  
  // Can't earn if at max capacity
  if (wallet.water >= wallet.maxWater) {
    return false;
  }
  
  // Can earn if never earned before, or if last earned was a different UTC day
  const lastWaterEarned = garden.lastWaterEarned;
  if (!lastWaterEarned) {
    return true; // Never earned before
  }
  
  // Check if last earned was a different UTC day
  const lastEarnedTimestamp = lastWaterEarned instanceof Timestamp 
    ? lastWaterEarned 
    : Timestamp.fromDate(new Date(lastWaterEarned));
  const today = Timestamp.now();
  
  return !isSameUTCDay(lastEarnedTimestamp, today);
}

/**
 * Ensure wallet and garden fields exist (migration helper)
 */
async function ensureWalletAndGarden(userDocRef: any, user: UserProfile): Promise<void> {
  const needsWallet = !user.wallet;
  const needsGarden = !user.garden;
  
  if (needsWallet || needsGarden) {
    const updates: any = {};
    if (needsWallet) {
      updates.wallet = getDefaultWallet();
    }
    if (needsGarden) {
      updates.garden = getDefaultGarden();
    }
    await updateDoc(userDocRef, updates);
    console.log('[Garden Logic] 🔄 Migrated user profile with wallet/garden fields');
  }
}

/**
 * Earn water if eligible (called when sending doodle/note)
 * Updates user profile in Firestore
 * Returns true if water was earned, false otherwise
 */
export async function earnWaterIfEligible(userId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.error('[Garden Logic] User not found:', userId);
      return false;
    }
    
    const user = userDoc.data() as UserProfile;
    
    // Ensure wallet/garden exist (migration)
    await ensureWalletAndGarden(userDocRef, user);
    
    // Re-fetch to get updated structure
    const updatedDoc = await getDoc(userDocRef);
    const updatedUser = updatedDoc.data() as UserProfile;
    
    // Fix wallet if needed (cap water and maxWater)
    const walletBeforeFix = updatedUser.wallet || getDefaultWallet();
    await fixWalletIfNeeded(userDocRef, walletBeforeFix);
    
    // Re-fetch after fix
    const fixedDoc = await getDoc(userDocRef);
    const fixedUser = fixedDoc.data() as UserProfile;
    
    if (!canEarnWater(fixedUser)) {
      console.log('[Garden Logic] Cannot earn water: at max capacity or already earned today');
      return false;
    }
    
    const wallet = normalizeWallet(fixedUser.wallet || getDefaultWallet());
    const garden = updatedUser.garden || getDefaultGarden();
    
    // Award 1 water drop
    const newWater = Math.min(wallet.water + 1, wallet.maxWater);
    
    // Update profile
    await updateDoc(userDocRef, {
      'wallet.water': newWater,
      'garden.lastWaterEarned': serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Garden Logic] 💧 Earned 1 water drop! Total:', newWater, '/', wallet.maxWater);
    return true;
  } catch (error) {
    console.error('[Garden Logic] Error earning water:', error);
    return false;
  }
}

// ============================================
// WATERING LOGIC
// ============================================

/**
 * Water the plant (manual action)
 * - Deducts 1 Water Drop
 * - Updates lastWatered to now
 * - Increments streakDays
 * - Checks if streak milestone reached -> Adds Gold
 * - Updates isWilted status
 * 
 * Returns: { success: boolean, earnedGold?: number, streakDays?: number }
 */
export async function waterPlant(userId: string): Promise<{
  success: boolean;
  earnedGold?: number;
  streakDays?: number;
  error?: string;
}> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const user = userDoc.data() as UserProfile;
    
    // Ensure wallet/garden exist (migration)
    await ensureWalletAndGarden(userDocRef, user);
    
    // Re-fetch to get updated structure
    const updatedDoc = await getDoc(userDocRef);
    const updatedUser = updatedDoc.data() as UserProfile;
    
    // Fix wallet if needed (cap water and maxWater)
    const walletBeforeFix = updatedUser.wallet || getDefaultWallet();
    await fixWalletIfNeeded(userDocRef, walletBeforeFix);
    
    // Re-fetch after fix
    const fixedDoc = await getDoc(userDocRef);
    const fixedUser = fixedDoc.data() as UserProfile;
    
    const wallet = normalizeWallet(fixedUser.wallet || getDefaultWallet());
    const garden = updatedUser.garden || getDefaultGarden();
    
    // Check if user has water
    if (wallet.water < 1) {
      return { success: false, error: 'Not enough water drops' };
    }
    
    // Deduct 1 water
    const newWater = wallet.water - 1;
    
    // Increment streak
    const newStreakDays = garden.streakDays + 1;
    
    // Check if milestone reached (e.g., every 3 days)
    let earnedGold = 0;
    const goldToAdd = Math.floor(newStreakDays / STREAK_MILESTONE_DAYS) - 
                     Math.floor(garden.streakDays / STREAK_MILESTONE_DAYS);
    
    if (goldToAdd > 0) {
      earnedGold = goldToAdd * STREAK_GOLD_REWARD;
    }
    
    const newGold = wallet.gold + earnedGold;
    
    // Update lastWatered and isWilted
    const now = Timestamp.now();
    const newIsWilted = false; // Fresh after watering
    
    // Build update object
    const updates: any = {
      'wallet.water': newWater,
      'wallet.gold': newGold,
      'garden.streakDays': newStreakDays,
      'garden.lastWatered': now,
      'garden.isWilted': newIsWilted,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(userDocRef, updates);
    
    if (earnedGold > 0) {
      console.log('[Garden Logic] 💰 Earned', earnedGold, 'gold! Streak:', newStreakDays, 'days');
    } else {
      console.log('[Garden Logic] 💧 Plant watered! Streak:', newStreakDays, 'days, Water remaining:', newWater);
    }
    
    return {
      success: true,
      earnedGold: earnedGold > 0 ? earnedGold : undefined,
      streakDays: newStreakDays,
    };
  } catch (error) {
    console.error('[Garden Logic] Error watering plant:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// STATUS QUERIES
// ============================================

/**
 * Fix wallet in database if water or maxWater exceeds limits
 */
async function fixWalletIfNeeded(userDocRef: any, wallet: { gold: number; water: number; maxWater: number }): Promise<void> {
  const normalized = normalizeWallet(wallet);
  // If wallet needs fixing, update it in the database
  if (wallet.water !== normalized.water || wallet.maxWater !== normalized.maxWater) {
    await updateDoc(userDocRef, {
      'wallet.water': normalized.water,
      'wallet.maxWater': normalized.maxWater,
      updatedAt: serverTimestamp(),
    });
    console.log('[Garden Logic] 🔧 Fixed wallet: water', wallet.water, '->', normalized.water, ', maxWater', wallet.maxWater, '->', normalized.maxWater);
  }
}

/**
 * Get user's wallet status
 */
export async function getUserWallet(userId: string): Promise<{
  gold: number;
  water: number;
  maxWater: number;
} | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const user = userDoc.data() as UserProfile;
    const wallet = user.wallet || getDefaultWallet();
    
    // Fix wallet in database if needed
    await fixWalletIfNeeded(userDocRef, wallet);
    
    const normalized = normalizeWallet(wallet);
    
    return {
      gold: normalized.gold,
      water: normalized.water,
      maxWater: normalized.maxWater,
    };
  } catch (error) {
    console.error('[Garden Logic] Error getting wallet:', error);
    return null;
  }
}

/**
 * Get user's garden status
 */
export async function getUserGardenStatus(userId: string): Promise<{
  currentPlantId: string | null;
  isWilted: boolean;
  streakDays: number;
  lastWatered: Timestamp | null;
  hoursUntilWilt: number | null;
} | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const user = userDoc.data() as UserProfile;
    const garden = user.garden || getDefaultGarden();
    
    // Calculate current wilt status
    const lastWatered = garden.lastWatered 
      ? (garden.lastWatered instanceof Timestamp 
          ? garden.lastWatered 
          : Timestamp.fromDate(new Date(garden.lastWatered)))
      : null;
    
    const isWilted = calculateIsWilted(lastWatered);
    
    // Calculate hours until wilt (if not already wilted)
    let hoursUntilWilt: number | null = null;
    if (!isWilted && lastWatered) {
      const now = Date.now();
      const lastWateredMs = lastWatered.toMillis();
      const hoursSinceWatered = (now - lastWateredMs) / (1000 * 60 * 60);
      hoursUntilWilt = Math.max(0, WILT_THRESHOLD_HOURS - hoursSinceWatered);
    }
    
    return {
      currentPlantId: garden.currentPlantId,
      isWilted,
      streakDays: garden.streakDays,
      lastWatered,
      hoursUntilWilt,
    };
  } catch (error) {
    console.error('[Garden Logic] Error getting garden status:', error);
    return null;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Sync isWilted status based on lastWatered (call periodically or after time passes)
 */
export async function syncWiltStatus(userId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const user = userDoc.data() as UserProfile;
    const garden = user.garden || getDefaultGarden();
    
    const lastWatered = garden.lastWatered 
      ? (garden.lastWatered instanceof Timestamp 
          ? garden.lastWatered 
          : Timestamp.fromDate(new Date(garden.lastWatered)))
      : null;
    
    const calculatedIsWilted = calculateIsWilted(lastWatered);
    
    // Only update if status changed
    if (calculatedIsWilted !== garden.isWilted) {
      await updateDoc(userDocRef, {
        'garden.isWilted': calculatedIsWilted,
        updatedAt: serverTimestamp(),
      });
      console.log('[Garden Logic] 🌱 Wilt status synced:', calculatedIsWilted ? 'WILTED' : 'FRESH');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Garden Logic] Error syncing wilt status:', error);
    return false;
  }
}

