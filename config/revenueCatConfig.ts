/**
 * RevenueCat Configuration
 * Handles RevenueCat SDK initialization for in-app purchases
 */

import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE } from 'react-native-purchases';

// RevenueCat API Keys
// Test keys for development - replace with production keys when ready
const iosApiKey = 'appl_bqCukUABBysiPKefpOdFBHDoZyA';
const androidApiKey = 'goog_WSQwSOPEXUwAuDoNVXnWXvzOUTM';

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts
 */
export async function initRevenueCat(): Promise<boolean> {
  if (isInitialized) {
    return true;
  }

  // Basic check - ensure Purchases exists
  if (!Purchases) {
    console.warn('[RevenueCat] ⚠️ Purchases module not available; skipping initialization (likely Expo Go or missing native module)');
    return false;
  }

  // Check if configure function exists
  if (typeof Purchases.configure !== 'function') {
    console.warn('[RevenueCat] ⚠️ Purchases.configure not available; skipping initialization');
    return false;
  }

  try {
    // Enable verbose logging for development (only if setLogLevel exists)
    if (__DEV__ && typeof Purchases.setLogLevel === 'function') {
      try {
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      } catch (logError) {
        // Log level setting is optional, continue even if it fails
        console.warn('[RevenueCat] Could not set log level:', logError);
      }
    }

    // Platform-specific API keys
    if (Platform.OS === 'ios') {
      await Purchases.configure({ apiKey: iosApiKey });
      console.log('[RevenueCat] ✅ Initialized for iOS');
      isInitialized = true;
      return true;
    } else if (Platform.OS === 'android') {
      await Purchases.configure({ apiKey: androidApiKey });
      console.log('[RevenueCat] ✅ Initialized for Android');
      isInitialized = true;
      return true;
    } else {
      console.warn('[RevenueCat] ⚠️ Platform not supported:', Platform.OS);
      return false;
    }
  } catch (error: any) {
    // More detailed error logging
    const errorMessage = error?.message || String(error);
    console.error('[RevenueCat] ❌ Failed to initialize:', errorMessage);
    
    // Check if it's a configuration error vs missing module
    if (errorMessage.includes('singleton') || errorMessage.includes('configure')) {
      console.error('[RevenueCat] Configuration error - this might indicate the native module is not properly linked');
    }
    
    return false;
  }
}

/**
 * Set user ID for RevenueCat
 * Call this when user logs in
 */
export async function setRevenueCatUserId(userId: string): Promise<void> {
  try {
    // Ensure SDK is configured before attempting logIn (avoids isConfigured null error)
    if (!isInitialized) {
      const initOk = await initRevenueCat();
      if (!initOk) {
        console.error('[RevenueCat] ❌ Cannot set user ID because SDK is not initialized');
        return;
      }
    }

    await Purchases.logIn(userId);
    console.log('[RevenueCat] ✅ User ID set:', userId);
  } catch (error) {
    console.error('[RevenueCat] ❌ Failed to set user ID:', error);
  }
}

/**
 * Log out current user from RevenueCat
 * Call this when user logs out
 * Handles anonymous users gracefully (you can't log out an anonymous user)
 */
export async function logOutRevenueCat(): Promise<void> {
  try {
    // Check if user is anonymous before attempting logout
    const customerInfo = await Purchases.getCustomerInfo();
    
    // If the user is anonymous (no appUserID or it's the default anonymous ID), skip logout
    if (!customerInfo.originalAppUserId || customerInfo.originalAppUserId.startsWith('$RCAnonymousID:')) {
      // User is already anonymous, no need to log out
      if (__DEV__) {
        console.log('[RevenueCat] ℹ️ User is already anonymous, skipping logout');
      }
      return;
    }

    // User is logged in, proceed with logout
    await Purchases.logOut();
    console.log('[RevenueCat] ✅ Logged out');
  } catch (error: any) {
    // Handle the specific error for anonymous users
    const errorMessage = error?.message || '';
    if (errorMessage.includes('anonymous') || errorMessage.includes('LogOut was called but the current user is anonymous')) {
      // User is anonymous, this is expected and not an error
      if (__DEV__) {
        console.log('[RevenueCat] ℹ️ User is anonymous, logout not needed');
      }
      return;
    }
    // For other errors, log them
    console.error('[RevenueCat] ❌ Failed to log out:', error);
  }
}

export { Purchases, PURCHASES_ERROR_CODE };




