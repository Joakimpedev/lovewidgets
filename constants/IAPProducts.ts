/**
 * In-App Purchase Product IDs
 * These must match exactly with products created in:
 * - Google Play Console (Android)
 * - App Store Connect (iOS)
 */

export const IAP_PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'lw_monthly_499',
  PREMIUM_YEARLY: 'lw_yearly_3999',
  PREMIUM_LIFETIME: 'premium_lifetime', // Keep for future use
} as const;

export type IAPProductId = typeof IAP_PRODUCT_IDS[keyof typeof IAP_PRODUCT_IDS];

export interface PremiumPlan {
  id: IAPProductId;
  name: string;
  description: string;
  price?: string; // Will be loaded from store
  popular?: boolean; // Mark popular plan
}

export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: IAP_PRODUCT_IDS.PREMIUM_MONTHLY,
    name: 'Monthly Premium',
    description: 'Access all premium features',
    price: '$4.99',
    popular: false,
  },
  {
    id: IAP_PRODUCT_IDS.PREMIUM_YEARLY,
    name: 'Yearly Premium',
    description: 'Best value - Save 50%',
    price: '$49.99',
    popular: true,
  },
  // Lifetime plan removed - only showing monthly and yearly subscriptions
];

