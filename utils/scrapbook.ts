/**
 * Scrapbook Utilities for LoveWidgets
 * Handles preserving garden memories and managing scrapbook data
 */

import { db } from '@/config/firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getUserProfileFromFirestore, UserProfile, ScrapbookMemory } from './pairing';
import { getSharedGardenState, PlantedFlower, PlantedLandmark } from './gardenState';
import { VisualThemeId } from '@/constants/ThemeConfig';

/**
 * Preserve the current garden state as a memory
 * 
 * Logic:
 * - Captures current gardenItems (flowers), horizonItems (landmarks), and currentThemeId
 * - Creates a Memory Object with snapshot data
 * - Pushes new memory to scrapbook array (unlimited saves for all users)
 * - After saving, resets gardenItems and horizonItems to empty arrays
 * 
 * @param userId - Current user ID
 * @param partnerId - Partner user ID
 * @param title - User-provided title for the memory
 * @param date - ISO date string (optional, defaults to current date)
 * @param themeId - Current visual theme ID
 */
export async function preserveMemory(
  userId: string,
  partnerId: string,
  title: string,
  themeId: VisualThemeId,
  date?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user profile to check premium status
    const userProfile = await getUserProfileFromFirestore(userId);
    if (!userProfile) {
      return { success: false, error: 'User profile not found' };
    }

    // Get current shared garden state
    const gardenState = await getSharedGardenState(userId, partnerId);
    
    // Capture current state
    const gardenSnapshot: PlantedFlower[] = [...(gardenState.flowers || [])];
    const landmarkSnapshot: PlantedLandmark[] = [...(gardenState.landmarks || [])];

    // Create Memory Object
    const memory: ScrapbookMemory = {
      id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      date: date || new Date().toISOString(),
      themeId,
      gardenSnapshot,
      landmarkSnapshot,
    };

    // Get current scrapbook array (or initialize empty)
    const currentScrapbook = userProfile.scrapbook || [];

    // Always push to array (unlimited memories for all users)
    // Note: Paywall limits can be added later for non-premium users
    const updatedScrapbook = [...currentScrapbook, memory];

    // Update user profile with new scrapbook
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      scrapbook: updatedScrapbook,
      updatedAt: serverTimestamp(),
    });

    console.log('[Scrapbook] ✅ Preserved memory:', title, 'Total memories:', updatedScrapbook.length);

    // Reset garden after saving
    // Note: We need to update the shared garden state to clear flowers and landmarks
    const { updateSharedGardenState } = await import('./gardenState');
    await updateSharedGardenState(userId, partnerId, {
      flowers: [],
      landmarks: [],
    });

    console.log('[Scrapbook] ✅ Garden reset after preservation');

    return { success: true };
  } catch (error) {
    console.error('[Scrapbook] Error preserving memory:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all scrapbook memories for a user
 */
export async function getScrapbookMemories(userId: string): Promise<ScrapbookMemory[]> {
  try {
    const userProfile = await getUserProfileFromFirestore(userId);
    if (!userProfile) {
      return [];
    }
    return userProfile.scrapbook || [];
  } catch (error) {
    console.error('[Scrapbook] Error getting memories:', error);
    return [];
  }
}


