/**
 * Widget Storage Utility
 * Handles saving and retrieving data for widgets
 * 
 * iOS: Uses App Groups via react-native-shared-group-preferences
 * Android: Uses AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import SharedGroupPreferences from 'react-native-shared-group-preferences';
import { Platform } from 'react-native';

const WIDGET_STORAGE_KEY = '@widget_image';
const IOS_APP_GROUP = 'group.com.lovewidgets.data';
const ANDROID_PREFS_NAME = 'love_widget_prefs';

/**
 * Save widget image data
 * @param imageUrl - Base64 data URL or file URI of the image
 */
export async function saveToWidget(imageUrl: string): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      // iOS: Save to App Group shared container
      try {
        await SharedGroupPreferences.setItem(WIDGET_STORAGE_KEY, imageUrl, IOS_APP_GROUP);
        console.log('[WidgetStorage] iOS: Saved to App Group successfully');
      } catch (error) {
        console.error('[WidgetStorage] iOS App Group save failed:', error);
        // Fallback to AsyncStorage if App Group fails
        await AsyncStorage.setItem(WIDGET_STORAGE_KEY, imageUrl);
        console.log('[WidgetStorage] iOS: Fallback to AsyncStorage');
      }
    } else if (Platform.OS === 'android') {
      // Android: Use SharedPreferences (not AsyncStorage) so Kotlin widget can read it
      try {
        await SharedGroupPreferences.setItem(WIDGET_STORAGE_KEY, imageUrl, ANDROID_PREFS_NAME);
        console.log('[WidgetStorage] Android: Saved to SharedPreferences successfully');
      } catch (error) {
        console.error('[WidgetStorage] Android SharedPreferences save failed:', error);
        // Fallback to AsyncStorage if SharedPreferences fails
        await AsyncStorage.setItem(WIDGET_STORAGE_KEY, imageUrl);
        console.log('[WidgetStorage] Android: Fallback to AsyncStorage');
      }
    }
  } catch (error) {
    console.error('[WidgetStorage] Error saving widget data:', error);
    throw error;
  }
}

/**
 * Get widget image data
 * @returns The saved image URL or null
 */
export async function getWidgetImage(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      // iOS: Read from App Group
      try {
        const imageUrl = await SharedGroupPreferences.getItem(WIDGET_STORAGE_KEY, IOS_APP_GROUP);
        return imageUrl as string | null;
      } catch (error) {
        console.error('[WidgetStorage] iOS App Group read failed:', error);
        // Fallback to AsyncStorage
        const imageUrl = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
        return imageUrl;
      }
    } else if (Platform.OS === 'android') {
      // Android: Read from SharedPreferences (not AsyncStorage) so it matches widget
      try {
        const imageUrl = await SharedGroupPreferences.getItem(WIDGET_STORAGE_KEY, ANDROID_PREFS_NAME);
        return imageUrl as string | null;
      } catch (error) {
        console.error('[WidgetStorage] Android SharedPreferences read failed:', error);
        // Fallback to AsyncStorage
        const imageUrl = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
        return imageUrl;
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
      try {
        await SharedGroupPreferences.removeItem(WIDGET_STORAGE_KEY, IOS_APP_GROUP);
        console.log('[WidgetStorage] iOS: Cleared from App Group');
      } catch (error) {
        console.error('[WidgetStorage] iOS App Group clear failed:', error);
      }
    } else if (Platform.OS === 'android') {
      try {
        await SharedGroupPreferences.removeItem(WIDGET_STORAGE_KEY, ANDROID_PREFS_NAME);
        console.log('[WidgetStorage] Android: Cleared from SharedPreferences');
      } catch (error) {
        console.error('[WidgetStorage] Android SharedPreferences clear failed:', error);
      }
    }
    // Also clear from AsyncStorage (fallback)
    await AsyncStorage.removeItem(WIDGET_STORAGE_KEY);
    console.log('[WidgetStorage] Widget data cleared');
  } catch (error) {
    console.error('[WidgetStorage] Error clearing widget data:', error);
    throw error;
  }
}

/**
 * Get the App Group identifier for iOS
 * This is used by the native widget code
 */
export function getIOSAppGroup(): string {
  return IOS_APP_GROUP;
}

