/**
 * Rewards Utilities
 * Handles reward logic for widget updates and question answers
 */

import { db } from '@/config/firebaseConfig';
import { doc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { getUserProfileFromFirestore } from './pairing';

/**
 * Check if a timestamp is from today (same calendar day)
 */
function isToday(timestamp: Timestamp | null): boolean {
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
 * Check if user has already updated widget today
 * Returns true if first time today, false if already updated today
 */
export async function isFirstWidgetUpdateToday(userId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      return true; // First time ever
    }
    
    const userData = userDocSnap.data();
    const lastWidgetUpdate = userData.lastWidgetUpdateDate as Timestamp | null;
    
    // If no last update or not today, it's the first time today
    return !isToday(lastWidgetUpdate);
  } catch (error) {
    console.error('[Rewards] Error checking widget update:', error);
    return true; // Default to first time on error
  }
}

/**
 * Mark widget as updated today and award water if first time
 * Returns true if water was awarded (first time today), false otherwise
 */
export async function processWidgetUpdateReward(userId: string): Promise<boolean> {
  try {
    const isFirstTime = await isFirstWidgetUpdateToday(userId);
    
    // Update last widget update date
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      lastWidgetUpdateDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Award water if first time today
    if (isFirstTime) {
      const userProfile = await getUserProfileFromFirestore(userId);
      const wallet = userProfile?.wallet || { gold: 0, water: 0, maxWater: 3 };
      // Normalize maxWater to cap at 3 and water to cap at maxWater
      const normalizedMaxWater = Math.min(wallet.maxWater, 3);
      const normalizedWater = Math.min(wallet.water, normalizedMaxWater);
      
      // Fix wallet in database if needed
      if (wallet.water !== normalizedWater || wallet.maxWater !== normalizedMaxWater) {
        await updateDoc(userDocRef, {
          'wallet.water': normalizedWater,
          'wallet.maxWater': normalizedMaxWater,
          updatedAt: serverTimestamp(),
        });
      }
      
      // Add 1 water (capped at maxWater)
      const newWater = Math.min(normalizedWater + 1, normalizedMaxWater);
      
      await updateDoc(userDocRef, {
        'wallet.water': newWater,
        updatedAt: serverTimestamp(),
      });
      
      console.log('[Rewards] 💧 Awarded 1 water for widget update. Total:', newWater, '/', normalizedMaxWater);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Rewards] Error processing widget update reward:', error);
    return false;
  }
}

/**
 * Award water for answering question of the day
 * Returns true if water was awarded
 */
export async function awardWaterForQuestion(userId: string): Promise<boolean> {
  try {
    const userProfile = await getUserProfileFromFirestore(userId);
    if (!userProfile) {
      console.error('[Rewards] User profile not found');
      return false;
    }
    
    const wallet = userProfile.wallet || { gold: 0, water: 0, maxWater: 3 };
    // Normalize maxWater to cap at 3 and water to cap at maxWater
    const normalizedMaxWater = Math.min(wallet.maxWater, 3);
    const normalizedWater = Math.min(wallet.water, normalizedMaxWater);
    
    const userDocRef = doc(db, 'users', userId);
    
    // Fix wallet in database if needed
    if (wallet.water !== normalizedWater || wallet.maxWater !== normalizedMaxWater) {
      await updateDoc(userDocRef, {
        'wallet.water': normalizedWater,
        'wallet.maxWater': normalizedMaxWater,
        updatedAt: serverTimestamp(),
      });
    }
    
    // Add 1 water (capped at maxWater)
    const newWater = Math.min(normalizedWater + 1, normalizedMaxWater);
    
    await updateDoc(userDocRef, {
      'wallet.water': newWater,
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Rewards] 💧 Awarded 1 water for question answer. Total:', newWater, '/', normalizedMaxWater);
    return true;
  } catch (error) {
    console.error('[Rewards] Error awarding water for question:', error);
    return false;
  }
}

