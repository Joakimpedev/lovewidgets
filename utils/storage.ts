/**
 * AsyncStorage utility for LoveWidgets
 * Handles local storage of user preferences and data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys
export const STORAGE_KEYS = {
  USER_PROFILE: '@lovewidgets/user_profile',
  ONBOARDING_COMPLETE: '@lovewidgets/onboarding_complete',
  PARTNER_ID: '@lovewidgets/partner_id',
  // Onboarding flow state
  ONBOARDING_IS_CONNECTED: '@lovewidgets/onboarding_is_connected',
  ONBOARDING_HAS_COMPLETED_TUTORIAL: '@lovewidgets/onboarding_has_completed_tutorial',
  ONBOARDING_HAS_PLANTED_FIRST_FLOWER: '@lovewidgets/onboarding_has_planted_first_flower',
  ONBOARDING_HAS_RECEIVED_STARTER_BUDGET: '@lovewidgets/onboarding_has_received_starter_budget',
} as const;

// Types
export type UserRole = 'Partner' | 'Bestie' | 'Family';

export interface UserProfile {
  name: string;
  role: UserRole;
  createdAt: string;
}

// User Profile Functions
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_PROFILE,
      JSON.stringify(profile)
    );
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return value === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}

// ============================================
// ONBOARDING FLOW STATE
// ============================================

export interface OnboardingState {
  isConnected: boolean;
  hasCompletedTutorial: boolean;
  hasPlantedFirstFlower: boolean;
  hasReceivedStarterBudget: boolean;
}

export async function getOnboardingState(): Promise<OnboardingState> {
  try {
    const [isConnected, hasCompletedTutorial, hasPlantedFirstFlower, hasReceivedStarterBudget] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_IS_CONNECTED),
      AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_HAS_COMPLETED_TUTORIAL),
      AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_HAS_PLANTED_FIRST_FLOWER),
      AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_HAS_RECEIVED_STARTER_BUDGET),
    ]);

    return {
      isConnected: isConnected === 'true',
      hasCompletedTutorial: hasCompletedTutorial === 'true',
      hasPlantedFirstFlower: hasPlantedFirstFlower === 'true',
      hasReceivedStarterBudget: hasReceivedStarterBudget === 'true',
    };
  } catch (error) {
    console.error('Error getting onboarding state:', error);
    return {
      isConnected: false,
      hasCompletedTutorial: false,
      hasPlantedFirstFlower: false,
      hasReceivedStarterBudget: false,
    };
  }
}

export async function setOnboardingState(state: Partial<OnboardingState>): Promise<void> {
  try {
    const updates: Promise<void>[] = [];
    
    if (state.isConnected !== undefined) {
      updates.push(AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_IS_CONNECTED, state.isConnected ? 'true' : 'false'));
    }
    if (state.hasCompletedTutorial !== undefined) {
      updates.push(AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_HAS_COMPLETED_TUTORIAL, state.hasCompletedTutorial ? 'true' : 'false'));
    }
    if (state.hasPlantedFirstFlower !== undefined) {
      updates.push(AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_HAS_PLANTED_FIRST_FLOWER, state.hasPlantedFirstFlower ? 'true' : 'false'));
    }
    if (state.hasReceivedStarterBudget !== undefined) {
      updates.push(AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_HAS_RECEIVED_STARTER_BUDGET, state.hasReceivedStarterBudget ? 'true' : 'false'));
    }
    
    await Promise.all(updates);
  } catch (error) {
    console.error('Error setting onboarding state:', error);
    throw error;
  }
}

