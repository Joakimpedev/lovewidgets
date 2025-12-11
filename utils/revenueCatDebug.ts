/**
 * Debug utility to inspect RevenueCat offerings and packages
 * Use this to see what subscriptions are available from RevenueCat
 */

import { Purchases } from '@/config/revenueCatConfig';

/**
 * Log all available offerings and packages from RevenueCat
 * Call this function to debug subscription setup
 */
export async function debugRevenueCatOfferings() {
  try {
    console.log('🔍 [RevenueCat Debug] Fetching offerings...');
    
    const offerings = await Purchases.getOfferings();
    
    console.log('📦 [RevenueCat Debug] All Offerings:', {
      current: offerings.current?.identifier || 'None',
      all: Object.keys(offerings.all),
    });

    if (offerings.current) {
      const current = offerings.current;
      console.log('✅ [RevenueCat Debug] Current Offering:', {
        identifier: current.identifier,
        serverDescription: current.serverDescription,
        metadata: current.metadata,
        availablePackagesCount: current.availablePackages.length,
      });

      console.log('📋 [RevenueCat Debug] Available Packages:');
      current.availablePackages.forEach((pkg: any, index: number) => {
        console.log(`\n  Package ${index + 1}:`, {
          identifier: pkg.identifier,
          packageType: pkg.packageType,
          hasStoreProduct: !!pkg.storeProduct,
        });

        if (pkg.storeProduct) {
          console.log('    Store Product:', {
            identifier: pkg.storeProduct.identifier,
            title: pkg.storeProduct.title,
            description: pkg.storeProduct.description,
            price: pkg.storeProduct.price,
            priceString: pkg.storeProduct.priceString,
            currencyCode: pkg.storeProduct.currencyCode,
            subscriptionPeriod: pkg.storeProduct.subscriptionPeriod,
            introPrice: pkg.storeProduct.introPrice,
          });
        } else {
          console.warn('    ⚠️ No storeProduct available for this package!');
        }
      });
    } else {
      console.warn('⚠️ [RevenueCat Debug] No current offering found!');
      console.log('Available offerings:', Object.keys(offerings.all));
    }

    // Also check customer info for entitlements
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('\n👤 [RevenueCat Debug] Customer Info:', {
        activeSubscriptions: customerInfo.activeSubscriptions,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
        allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
      });
    } catch (error) {
      console.warn('⚠️ [RevenueCat Debug] Could not fetch customer info:', error);
    }

    return offerings;
  } catch (error) {
    console.error('❌ [RevenueCat Debug] Error:', error);
    throw error;
  }
}




