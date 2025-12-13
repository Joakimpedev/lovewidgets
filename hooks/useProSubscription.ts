/**
 * Custom hook to check if user has active 'lovewidgets_pro' subscription entitlement
 * Returns a simple isPro boolean
 */

import { useState, useEffect } from 'react';
import { Purchases } from '@/config/revenueCatConfig';
import { Platform } from 'react-native';

const ENTITLEMENT_ID = 'lovewidgets_pro';

export function useProSubscription(): { isPro: boolean; isLoading: boolean } {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkSubscriptionStatus() {
      try {
        // Check if running on supported platform
        if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
          if (isMounted) {
            setIsPro(false);
            setIsLoading(false);
          }
          return;
        }

        // Get customer info from RevenueCat
        const customerInfo = await Purchases.getCustomerInfo();

        // Check if user has the 'lovewidgets_pro' entitlement active
        const hasProEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

        if (isMounted) {
          setIsPro(hasProEntitlement);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[useProSubscription] Error checking subscription:', error);
        if (isMounted) {
          setIsPro(false);
          setIsLoading(false);
        }
      }
    }

    // Initial check
    checkSubscriptionStatus();

    // Set up listener for customer info updates
    const customerInfoUpdateListener = Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      if (isMounted) {
        const hasProEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
        setIsPro(hasProEntitlement);
      }
    });

    return () => {
      isMounted = false;
      customerInfoUpdateListener.remove();
    };
  }, []);

  return { isPro, isLoading };
}








