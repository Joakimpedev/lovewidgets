/**
 * Widget Storage Utility
 * Handles saving and retrieving data for widgets
 * 
 * iOS: Uses App Groups via react-native-shared-group-preferences
 * Android: Uses SharedPreferences via native module
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const WIDGET_STORAGE_KEY = '@widget_image';
const IOS_APP_GROUP = 'group.com.lovewidgets.data';

// Configuration: Set to true for testing (both sender and receiver widgets update)
// Set to false for production (only receiver's widget updates)
const UPDATE_SENDER_WIDGET = true; // Change to false for production

// Try to import SharedGroupPreferences for iOS
let SharedGroupPreferences: any = null;
try {
  SharedGroupPreferences = require('react-native-shared-group-preferences');
} catch (e) {
  console.warn('[WidgetStorage] react-native-shared-group-preferences not available');
}

// Native modules for widget reload
// Safely extract modules - they may not exist in Expo Go or if not linked
const WidgetModule = NativeModules?.WidgetModule || null;
const WidgetStorageModule = NativeModules?.WidgetStorageModule || null;

/**
 * Reload widget to show latest image
 * Calls native module to trigger widget update
 */
export async function reloadWidget(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      if (WidgetModule && WidgetModule.reloadWidget) {
        await WidgetModule.reloadWidget();
        console.log('[WidgetStorage] ✅ iOS: Widget reload triggered');
      } else {
        console.warn('[WidgetStorage] WidgetModule not available - widget may not update immediately');
      }
    } else if (Platform.OS === 'android') {
      if (WidgetStorageModule && WidgetStorageModule.reloadWidget) {
        await WidgetStorageModule.reloadWidget();
        console.log('[WidgetStorage] ✅ Android: Widget reload triggered');
      } else {
        console.warn('[WidgetStorage] WidgetStorageModule not available - widget may not update immediately');
      }
    }
  } catch (error: any) {
    console.warn('[WidgetStorage] Widget reload failed (non-critical):', error?.message || error);
    // Don't throw - this is non-critical
  }
}

/**
 * Save widget image data
 * @param imageUrl - Base64 data URL or file URI of the image
 * @param isFromSender - If true, this is from the sender (for testing). If false/undefined, this is from receiver (production behavior)
 */
export async function saveToWidget(imageUrl: string, isFromSender: boolean = false): Promise<void> {
  // For production: Only update widget when receiver gets the drawing
  // For testing: Update both sender and receiver widgets
  if (isFromSender && !UPDATE_SENDER_WIDGET) {
    console.log('[WidgetStorage] Sender widget update skipped (UPDATE_SENDER_WIDGET = false)');
    return;
  }
  try {
    if (Platform.OS === 'ios') {
      // iOS: Save to App Group via native WidgetModule
      if (WidgetModule && WidgetModule.saveWidgetData) {
        try {
          await WidgetModule.saveWidgetData(WIDGET_STORAGE_KEY, imageUrl);
          console.log('[WidgetStorage] ✅ iOS: Saved to App Group via WidgetModule successfully');
          console.log('[WidgetStorage] Image data length:', imageUrl.length);
          // Widget reload is already triggered in the native module
          return;
        } catch (error: any) {
          console.error('[WidgetStorage] ❌ iOS WidgetModule save failed:', error?.message || error);
          console.error('[WidgetStorage] Error details:', error);
          
          // Fallback to AsyncStorage (widget won't read it, but we have the data)
          try {
            await AsyncStorage.setItem(WIDGET_STORAGE_KEY, imageUrl);
            console.log('[WidgetStorage] Saved to AsyncStorage as fallback (widget cannot read this)');
          } catch (asyncError: any) {
            console.error('[WidgetStorage] AsyncStorage fallback also failed:', asyncError?.message);
          }
        }
      } else {
        console.warn('[WidgetStorage] WidgetModule not available - saving to AsyncStorage as fallback');
        await AsyncStorage.setItem(WIDGET_STORAGE_KEY, imageUrl);
      }
    
    } else if (Platform.OS === 'android') {
      // Android: Save via native module to SharedPreferences
      if (WidgetStorageModule && WidgetStorageModule.saveWidgetData) {
        try {
          await WidgetStorageModule.saveWidgetData(WIDGET_STORAGE_KEY, imageUrl);
          console.log('[WidgetStorage] ✅ Android: Saved to SharedPreferences successfully');
          console.log('[WidgetStorage] Image data length:', imageUrl.length);
          // Widget reload is already triggered in the native module
        } catch (error: any) {
          console.error('[WidgetStorage] ❌ Android SharedPreferences save failed:', error?.message || error);
          // Fallback to AsyncStorage
          try {
            await AsyncStorage.setItem(WIDGET_STORAGE_KEY, imageUrl);
            console.log('[WidgetStorage] Saved to AsyncStorage as fallback');
          } catch (asyncError: any) {
            console.error('[WidgetStorage] AsyncStorage fallback also failed:', asyncError?.message);
          }
        }
      } else {
        console.warn('[WidgetStorage] WidgetStorageModule not available - saving to AsyncStorage only');
        await AsyncStorage.setItem(WIDGET_STORAGE_KEY, imageUrl);
      }
    }
  } catch (error) {
    console.error('[WidgetStorage] Unexpected error saving widget data:', error);
    // Don't throw - allow the drawing to still be sent
  }
}

/**
 * Get widget image data
 * @returns The saved image URL or null
 */
export async function getWidgetImage(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      if (!SharedGroupPreferences || !SharedGroupPreferences.getItem) {
        // Fallback to AsyncStorage
        return await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
      }

      try {
        const imageUrl = await SharedGroupPreferences.getItem(WIDGET_STORAGE_KEY, IOS_APP_GROUP);
        return imageUrl as string | null;
      } catch (error) {
        console.error('[WidgetStorage] iOS App Group read failed:', error);
        // Fallback to AsyncStorage
        return await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
      }
    } else if (Platform.OS === 'android') {
      if (WidgetStorageModule && WidgetStorageModule.getWidgetData) {
        try {
          const imageUrl = await WidgetStorageModule.getWidgetData(WIDGET_STORAGE_KEY);
          return imageUrl as string | null;
        } catch (error) {
          console.error('[WidgetStorage] Android SharedPreferences read failed:', error);
          // Fallback to AsyncStorage
          return await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
        }
      } else {
        // Fallback to AsyncStorage
        return await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
      }
    }
    return null;
  } catch (error) {
    console.error('[WidgetStorage] Error reading widget data:', error);
    return null;
  }
}

/**
 * Clear widget data
 */
export async function clearWidgetData(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      if (SharedGroupPreferences && SharedGroupPreferences.removeItem) {
        try {
          await SharedGroupPreferences.removeItem(WIDGET_STORAGE_KEY, IOS_APP_GROUP);
          console.log('[WidgetStorage] iOS: Cleared from App Group');
        } catch (error) {
          console.error('[WidgetStorage] iOS App Group clear failed:', error);
        }
      }
    } else if (Platform.OS === 'android') {
      if (WidgetStorageModule && WidgetStorageModule.saveWidgetData) {
        try {
          await WidgetStorageModule.saveWidgetData(WIDGET_STORAGE_KEY, '');
          console.log('[WidgetStorage] Android: Cleared from SharedPreferences');
        } catch (error) {
          console.error('[WidgetStorage] Android SharedPreferences clear failed:', error);
        }
      }
    }
    // Also clear from AsyncStorage (fallback)
    await AsyncStorage.removeItem(WIDGET_STORAGE_KEY);
    console.log('[WidgetStorage] Widget data cleared');
    
    // Reload widget to show empty state
    await reloadWidget();
  } catch (error) {
    console.error('[WidgetStorage] Error clearing widget data:', error);
  }
}

/**
 * Get the App Group identifier for iOS
 * This is used by the native widget code
 */
export function getIOSAppGroup(): string {
  return IOS_APP_GROUP;
}

