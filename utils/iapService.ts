/**
 * In-App Purchase Service
 * Handles all IAP operations using RevenueCat
 * Works on both iOS and Android
 */

import { Platform } from 'react-native';
import { IAP_PRODUCT_IDS, type IAPProductId } from '@/constants/IAPProducts';
import { updatePremiumStatus } from './pairing';

// Import Purchases with error handling for Expo Go compatibility
let Purchases: any;
let PURCHASES_ERROR_CODE: any;
try {
  const purchasesModule = require('react-native-purchases');
  Purchases = purchasesModule.Purchases || purchasesModule.default;
  PURCHASES_ERROR_CODE = purchasesModule.PURCHASES_ERROR_CODE;
} catch (error) {
  console.warn('[IAP] react-native-purchases not available (likely running in Expo Go)');
  Purchases = null;
}

// ============================================
// TYPES
// ============================================

export interface IAPProduct {
  productId: string;
  price: string;
  title: string;
  description: string;
  currency: string;
}

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  error?: string;
}

// ============================================
// INITIALIZATION
// ============================================

let isInitialized = false;

/**
 * Initialize IAP connection
 * Note: RevenueCat is initialized globally in _layout.tsx
 * This function checks if it's available
 */
export async function initIAP(): Promise<boolean> {
  if (isInitialized) {
    return true;
  }

  try {
    // RevenueCat should already be initialized in _layout.tsx
    // Just verify it's available
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.warn('[IAP] Platform not supported:', Platform.OS);
      return false;
    }

    isInitialized = true;
    console.log('[IAP] ✅ RevenueCat available');
    return true;
  } catch (error) {
    console.error('[IAP] ❌ Failed to initialize:', error);
    return false;
  }
}

/**
 * Disconnect from IAP (cleanup)
 * Note: RevenueCat doesn't need explicit disconnection
 */
export async function disconnectIAP(): Promise<void> {
  // RevenueCat handles connection management automatically
  isInitialized = false;
  console.log('[IAP] Disconnected');
}

// ============================================
// GET PRODUCTS
// ============================================

/**
 * Get available products with prices
 * Returns products from RevenueCat offerings
 */
export async function getAvailableProducts(): Promise<IAPProduct[]> {
  try {
    // Check if Purchases is available
    if (!Purchases) {
      console.warn('[IAP] ⚠️ RevenueCat not available (likely Expo Go). Returning mock products for testing.');
      // Return mock products for testing in Expo Go
      // These match your actual product IDs for UI testing
      return [
        {
          productId: 'lw_monthly_499',
          price: '$4.99',
          title: 'Monthly Premium',
          description: 'Monthly premium subscription',
          currency: 'USD',
        },
        {
          productId: 'lw_yearly_3999',
          price: '$39.99',
          title: 'Yearly Premium',
          description: 'Yearly premium subscription',
          currency: 'USD',
        },
      ];
    }

    // Ensure RevenueCat is initialized before trying to use it
    // Import initRevenueCat from the config
    const { initRevenueCat } = require('@/config/revenueCatConfig');
    const rcInitialized = await initRevenueCat();
    if (!rcInitialized) {
      console.error('[IAP] ❌ RevenueCat not initialized. Cannot fetch products.');
      return [];
    }

    if (!isInitialized) {
      const initialized = await initIAP();
      if (!initialized) {
        return [];
      }
    }

    // Fetch products directly by ID (skip offerings - we only use subscription products)
    const productIds = [IAP_PRODUCT_IDS.PREMIUM_MONTHLY, IAP_PRODUCT_IDS.PREMIUM_YEARLY];
    const products: IAPProduct[] = [];
    
    try {
      console.log('[IAP] 🔍 Fetching products from App Store:', productIds);
      
      // Fetch products directly from the store using product IDs
      const productsByIds = await Purchases.getProducts(productIds);
      console.log('[IAP] ✅ Fetched products directly:', productsByIds.length);
      
      if (productsByIds.length === 0) {
        console.warn('[IAP] ⚠️ No products returned from App Store. This usually means:');
        console.warn('[IAP]   1. Products not created in App Store Connect');
        console.warn('[IAP]   2. Products not approved/available yet');
        console.warn('[IAP]   3. App not properly signed for IAP testing');
        console.warn('[IAP]   4. Test account doesn\'t have access to products');
        return [];
      }
      
      productsByIds.forEach((product: any) => {
        console.log('[IAP] 📦 Product found:', {
          id: product.identifier,
          title: product.title,
          price: product.priceString,
          currency: product.currencyCode,
        });
        
        products.push({
          productId: product.identifier,
          price: product.priceString || '',
          title: product.title || '',
          description: product.description || '',
          currency: product.currencyCode || '',
        });
      });
      
      console.log('[IAP] ✅ Loaded products:', products.map(p => `${p.productId}: ${p.price}`));
    } catch (error: any) {
      console.error('[IAP] ❌ Error fetching products by ID:', error);
      console.error('[IAP] Error details:', {
        message: error?.message,
        code: error?.code,
        userInfo: error?.userInfo,
      });
      return [];
    }

    return products;
  } catch (error: any) {
    console.error('[IAP] ❌ Error getting products:', error);
    return [];
  }
}

// ============================================
// PURCHASE
// ============================================

/**
 * Purchase a product
 * Shows native payment dialog
 */
export async function purchaseProduct(
  productId: IAPProductId,
  userId: string
): Promise<PurchaseResult> {
  try {
    // Check if Purchases is available
    if (!Purchases) {
      return { 
        success: false, 
        error: 'In-app purchases not available. Please use a development or production build (not Expo Go).' 
      };
    }

    // Ensure RevenueCat is initialized before trying to use it
    const { initRevenueCat } = require('@/config/revenueCatConfig');
    const rcInitialized = await initRevenueCat();
    if (!rcInitialized) {
      return { 
        success: false, 
        error: 'RevenueCat not initialized. Please restart the app.' 
      };
    }

    if (!isInitialized) {
      const initialized = await initIAP();
      if (!initialized) {
        return { 
          success: false, 
          error: 'In-app purchases not available. Please use a development or production build.' 
        };
      }
    }

    // Purchase product directly by ID (skip offerings - we only use subscription products)
    let customerInfo: any;
    
    try {
      // Purchase via product identifier directly
      customerInfo = await Purchases.purchaseStoreProduct(productId);
    } catch (purchaseError: any) {
      // If direct purchase fails, try to find it in offerings as fallback
      console.warn('[IAP] Direct purchase failed, trying offerings as fallback:', purchaseError);
      
      try {
        const offerings = await Purchases.getOfferings();
        const currentOffering = offerings.current;
        
        if (currentOffering) {
          const packageToPurchase = currentOffering.availablePackages.find(
            (pkg: any) => 
              (pkg.storeProduct && pkg.storeProduct.identifier === productId)
          );
          
          if (packageToPurchase) {
            customerInfo = await Purchases.purchasePackage(packageToPurchase);
          } else {
            throw purchaseError; // Re-throw original error if package not found
          }
        } else {
          throw purchaseError; // Re-throw original error if no offering
        }
      } catch (fallbackError) {
        throw purchaseError; // Re-throw original error
      }
    }

    // Check if purchase was successful and user has pro entitlement
    const hasProEntitlement = customerInfo.entitlements.active['lovewidgets_pro'] !== undefined;
    const hasPremiumEntitlement = customerInfo.entitlements.active['premium'] !== undefined; // Fallback for old entitlement
    
    if (hasProEntitlement || hasPremiumEntitlement || 
        customerInfo.activeSubscriptions.includes(productId) || 
        customerInfo.nonSubscriptionTransactions.some(t => t.productIdentifier === productId)) {
      console.log('[IAP] ✅ Purchase successful:', productId);
      
      // Update premium status in Firestore
      await updatePremiumStatus(userId, true);
      
      return { success: true, productId };
    } else {
      console.warn('[IAP] ⚠️ Purchase completed but premium not active');
      return { success: false, error: 'Purchase completed but premium status not updated' };
    }
  } catch (error: any) {
    console.error('[IAP] ❌ Purchase error:', error);
    
    // Handle specific error codes
    if (PURCHASES_ERROR_CODE) {
      if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED) {
        return { success: false, error: 'Purchase canceled' };
      } else if (error.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING) {
        return { success: false, error: 'Payment is pending' };
      } else if (error.code === PURCHASES_ERROR_CODE.PURCHASE_INVALID) {
        return { success: false, error: 'Purchase invalid' };
      } else if (error.code === PURCHASES_ERROR_CODE.STORE_PROBLEM) {
        return { success: false, error: 'Store problem. Please try again later.' };
      }
    }
    
    return { 
      success: false, 
      error: error.message || 'Purchase failed. Please try again.' 
    };
  }
}

// ============================================
// RESTORE PURCHASES
// ============================================

/**
 * Restore previous purchases
 * Useful when user reinstalls app or gets new device
 */
export async function restorePurchases(userId: string): Promise<PurchaseResult> {
  try {
    // Check if Purchases is available
    if (!Purchases) {
      return { success: false, error: 'In-app purchases not available. Please use a development or production build (not Expo Go).' };
    }

    if (!isInitialized) {
      const initialized = await initIAP();
      if (!initialized) {
        return { success: false, error: 'In-app purchases not available' };
      }
    }

    // Restore purchases via RevenueCat
    const customerInfo = await Purchases.restorePurchases();
    
    // Check if user has premium entitlement or any premium products
    const hasPremiumEntitlement = customerInfo.entitlements.active['premium'] !== undefined;
    const hasPremiumProducts = Object.values(IAP_PRODUCT_IDS).some(productId =>
      customerInfo.activeSubscriptions.includes(productId) ||
      customerInfo.nonSubscriptionTransactions.some(t => t.productIdentifier === productId)
    );

    if (hasPremiumEntitlement || hasPremiumProducts) {
      // Restore premium status
      await updatePremiumStatus(userId, true);
      console.log('[IAP] ✅ Purchases restored');
      return { success: true };
    } else {
      console.log('[IAP] ⚠️ No premium purchases found to restore');
      return { success: false, error: 'No purchases found' };
    }
  } catch (error: any) {
    console.error('[IAP] ❌ Restore error:', error);
    return { success: false, error: error.message || 'Restore failed' };
  }
}

// ============================================
// CHECK PURCHASE STATUS
// ============================================

/**
 * Check if user currently has an active purchase
 */
export async function checkPurchaseStatus(userId: string): Promise<boolean> {
  try {
    // Check if Purchases is available
    if (!Purchases) {
      return false;
    }

    if (!isInitialized) {
      const initialized = await initIAP();
      if (!initialized) {
        return false;
      }
    }

    // Get customer info from RevenueCat
    const customerInfo = await Purchases.getCustomerInfo();
    
    // Check for premium entitlement
    const hasPremiumEntitlement = customerInfo.entitlements.active['premium'] !== undefined;
    
    // Check for premium products (subscriptions or one-time purchases)
    const hasPremiumProducts = Object.values(IAP_PRODUCT_IDS).some(productId => {
      // Check active subscriptions
      if (customerInfo.activeSubscriptions.includes(productId)) {
        return true;
      }
      
      // Check non-subscription transactions (one-time purchases like lifetime)
      if (customerInfo.nonSubscriptionTransactions.some(
        t => t.productIdentifier === productId
      )) {
        return true;
      }
      
      return false;
    });

    return hasPremiumEntitlement || hasPremiumProducts;
  } catch (error) {
    console.error('[IAP] ❌ Error checking purchase status:', error);
    return false;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get formatted price string
 */
export function formatPrice(price: string, currency?: string): string {
  if (!price) return 'Loading...';
  
  // Prices from RevenueCat are already formatted with currency symbol
  return price;
}

/**
 * Check if IAP is available on this device
 */
export function isIAPAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Check if IAP module is actually available
 * Call this before showing IAP UI
 */
export async function isIAPModuleAvailable(): Promise<boolean> {
  if (!isIAPAvailable()) {
    return false;
  }
  
  // Check if Purchases module is available
  if (!Purchases) {
    return false;
  }
  
  try {
    // Try to get customer info as a way to verify RevenueCat is initialized
    await Purchases.getCustomerInfo();
    return true;
  } catch (error) {
    return false;
  }
}
