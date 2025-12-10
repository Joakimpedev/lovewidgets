/**
 * Paywall Screen Component
 * Displays subscription products (monthly/annual) fetched from RevenueCat offerings
 * Includes "Buy Now" buttons for each subscription option
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Crown, Check } from 'lucide-react-native';
import { Purchases, PURCHASES_ERROR_CODE } from '@/config/revenueCatConfig';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';

// ============================================
// TYPES
// ============================================

interface PaywallScreenProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

interface SubscriptionPackage {
  identifier: string;
  packageType: string;
  storeProduct: {
    identifier: string;
    title: string;
    description: string;
    price: string;
    priceString: string;
    currencyCode: string;
  };
}

// ============================================
// COMPONENT
// ============================================

export function PaywallScreen({
  visible,
  onClose,
  onPurchaseComplete,
}: PaywallScreenProps) {
  const colorScheme = useColorScheme();
  const { themeId, colors: themeColors } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Load offerings when screen becomes visible
  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  /**
   * Fetch available subscription offerings from RevenueCat
   */
  async function loadOfferings() {
    setLoading(true);
    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;

      if (!currentOffering) {
        console.warn('[PaywallScreen] No current offering available');
        setPackages([]);
        setLoading(false);
        return;
      }

      // Fetch products directly using product IDs
      // This works even if packages don't have storeProduct attached
      const productIds = ['lw_monthly_499', 'lw_yearly_3999'];
      
      let mappedPackages: SubscriptionPackage[] = [];
      
      try {
        // Fetch products directly from the store
        const products = await Purchases.getProducts(productIds);
        console.log('[PaywallScreen] ✅ Fetched products directly:', products.length);
        
        // Map products to packages
        mappedPackages = products.map((product: any) => {
          // Try to find matching package from offering
          const matchingPackage = currentOffering.availablePackages.find(
            (pkg: any) => pkg.storeProduct?.identifier === product.identifier
          );
          
          return {
            identifier: matchingPackage?.identifier || product.identifier,
            packageType: matchingPackage?.packageType || 'CUSTOM',
            storeProduct: {
              identifier: product.identifier,
              title: product.title || 'Premium Subscription',
              description: product.description || '',
              price: product.price?.toString() || '0',
              priceString: product.priceString || 'Loading...',
              currencyCode: product.currencyCode || 'USD',
            },
          };
        });
        
        console.log(`[PaywallScreen] ✅ Mapped ${mappedPackages.length} package(s)`);
      } catch (error: any) {
        console.warn('[PaywallScreen] Could not fetch products directly, trying packages:', error);
        
        // Fallback: Try to get from packages
        const availablePackages = currentOffering.availablePackages;
        
        mappedPackages = availablePackages
          .filter((pkg: any) => {
            // Only use packages that have storeProduct and match our product IDs
            if (!pkg.storeProduct) {
              return false;
            }
            return productIds.includes(pkg.storeProduct.identifier);
          })
          .map((pkg: any) => ({
            identifier: pkg.identifier,
            packageType: pkg.packageType,
            storeProduct: {
              identifier: pkg.storeProduct.identifier,
              title: pkg.storeProduct.title || 'Premium Subscription',
              description: pkg.storeProduct.description || '',
              price: pkg.storeProduct.price?.toString() || '0',
              priceString: pkg.storeProduct.priceString || 'Loading...',
              currencyCode: pkg.storeProduct.currencyCode || 'USD',
            },
          }));
      }

      // Sort: monthly first, then annual
      mappedPackages.sort((a, b) => {
        const aIsMonthly = a.storeProduct.identifier === 'lw_monthly_499' ||
                          a.storeProduct.identifier.toLowerCase().includes('monthly');
        const bIsMonthly = b.storeProduct.identifier === 'lw_monthly_499' ||
                          b.storeProduct.identifier.toLowerCase().includes('monthly');
        
        if (aIsMonthly && !bIsMonthly) return -1;
        if (!aIsMonthly && bIsMonthly) return 1;
        return 0;
      });

      setPackages(mappedPackages);
    } catch (error: any) {
      console.error('[PaywallScreen] Error loading offerings:', error);
      Alert.alert('Error', 'Failed to load subscription plans. Please try again.');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle purchase of a subscription package
   */
  async function handlePurchase(pkg: SubscriptionPackage) {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to purchase a subscription');
      return;
    }

    setPurchasing(pkg.identifier);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Try to purchase via package first, then fallback to direct product purchase
      let customerInfo: any;
      
      try {
        const offerings = await Purchases.getOfferings();
        const currentOffering = offerings.current;

        if (currentOffering) {
          // Find package by identifier or by matching product ID
          const packageToPurchase = currentOffering.availablePackages.find(
            (p: any) => 
              p.identifier === pkg.identifier ||
              p.storeProduct?.identifier === pkg.storeProduct.identifier
          );

          if (packageToPurchase && packageToPurchase.storeProduct) {
            // Purchase via package (preferred method)
            customerInfo = await Purchases.purchasePackage(packageToPurchase);
          } else {
            throw new Error('Package not found or invalid');
          }
        } else {
          throw new Error('No offering available');
        }
      } catch (packageError) {
        console.log('[PaywallScreen] Package purchase failed, trying direct product purchase:', packageError);
        // Fallback: Purchase product directly using product ID
        customerInfo = await Purchases.purchaseStoreProduct(pkg.storeProduct.identifier);
      }

      // Check if purchase was successful by verifying the entitlement
      const hasProEntitlement = customerInfo.entitlements.active['lovewidgets_pro'] !== undefined;

      if (hasProEntitlement) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success!', 'Your subscription is now active. Enjoy Premium!', [
          {
            text: 'Awesome!',
            onPress: () => {
              onPurchaseComplete?.();
              onClose();
            },
          },
        ]);
      } else {
        throw new Error('Purchase completed but entitlement not active');
      }
    } catch (error: any) {
      console.error('[PaywallScreen] Purchase error:', error);

      // Handle specific error codes
      if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED) {
        // User cancelled, don't show error
        return;
      } else if (error.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING) {
        Alert.alert('Payment Pending', 'Your payment is being processed. Please wait.');
      } else if (error.code === PURCHASES_ERROR_CODE.PURCHASE_INVALID) {
        Alert.alert('Purchase Invalid', 'The purchase could not be completed. Please try again.');
      } else if (error.code === PURCHASES_ERROR_CODE.STORE_PROBLEM) {
        Alert.alert('Store Problem', 'There was an issue with the store. Please try again later.');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Purchase Failed',
          error.message || 'Something went wrong. Please try again.'
        );
      }
    } finally {
      setPurchasing(null);
    }
  }

  /**
   * Handle restore purchases
   */
  async function handleRestore() {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to restore purchases');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const customerInfo = await Purchases.restorePurchases();

      // Check if user has the pro entitlement
      const hasProEntitlement = customerInfo.entitlements.active['lovewidgets_pro'] !== undefined;

      if (hasProEntitlement) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success!', 'Your purchases have been restored.', [
          {
            text: 'OK',
            onPress: () => {
              onPurchaseComplete?.();
              onClose();
            },
          },
        ]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('No Purchases Found', 'We couldn\'t find any purchases to restore.');
      }
    } catch (error: any) {
      console.error('[PaywallScreen] Restore error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={[styles.content, { backgroundColor: colors.cardBackground }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Crown size={24} color={colors.tint} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Upgrade to Premium</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: colors.background }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={[styles.heroIconContainer, { backgroundColor: colors.highlight }]}>
              <Crown size={40} color={colors.tint} fill={colors.tint} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Unlock Premium Features
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Get access to all premium features and exclusive content
            </Text>
          </View>

          {/* Subscription Packages */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading subscription plans...
              </Text>
            </View>
          ) : packages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No subscription plans available at this time.
              </Text>
            </View>
          ) : (
            <View style={styles.packagesSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Choose Your Plan
              </Text>

              {packages.map((pkg) => {
                const isMonthly = pkg.storeProduct.identifier === 'lw_monthly_499' ||
                  pkg.storeProduct.identifier.toLowerCase().includes('monthly');
                const isAnnual = pkg.storeProduct.identifier === 'lw_yearly_3999' ||
                  pkg.storeProduct.identifier.toLowerCase().includes('annual') ||
                  pkg.storeProduct.identifier.toLowerCase().includes('yearly');
                
                const isPurchasing = purchasing === pkg.identifier;
                const isPopular = isAnnual; // Mark annual as popular

                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.packageCard,
                      isPopular && styles.packageCardPopular,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      isPopular && { borderColor: colors.tint },
                    ]}
                    onPress={() => handlePurchase(pkg)}
                    disabled={isPurchasing}
                    activeOpacity={0.8}
                  >
                    {isPopular && (
                      <View style={[styles.popularBadge, { backgroundColor: colors.tint }]}>
                        <Text style={styles.popularText}>BEST VALUE</Text>
                      </View>
                    )}

                    <View style={styles.packageHeader}>
                      <View style={styles.packageTitleContainer}>
                        <Text style={[styles.packageName, { color: colors.text }]}>
                          {isMonthly ? 'Monthly' : isAnnual ? 'Annual' : pkg.storeProduct.title}
                        </Text>
                        {isAnnual && (
                          <Text style={[styles.saveBadge, { color: colors.tint }]}>
                            Save up to 50%
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.packagePrice, { color: colors.tint }]}>
                        {pkg.storeProduct.priceString}
                      </Text>
                    </View>

                    {pkg.storeProduct.description && (
                      <Text style={[styles.packageDescription, { color: colors.textSecondary }]}>
                        {pkg.storeProduct.description}
                      </Text>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.buyButton,
                        { backgroundColor: colors.tint },
                        isPurchasing && styles.buyButtonDisabled,
                      ]}
                      onPress={() => handlePurchase(pkg)}
                      disabled={isPurchasing}
                    >
                      {isPurchasing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.buyButtonText}>Buy Now</Text>
                      )}
                    </TouchableOpacity>

                    {isPurchasing && (
                      <View style={styles.purchasingOverlay}>
                        <ActivityIndicator size="small" color={colors.tint} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Restore Purchases */}
          <TouchableOpacity
            onPress={handleRestore}
            style={styles.restoreButton}
          >
            <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
              Restore Purchases
            </Text>
          </TouchableOpacity>

          {/* Footer Note */}
          <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
            Payment will be charged to your {Platform.OS === 'ios' ? 'Apple' : 'Google'} account.
            Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  packagesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  packageCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
    position: 'relative',
  },
  packageCardPopular: {
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  packageHeader: {
    marginBottom: 12,
  },
  packageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  packageName: {
    fontSize: 20,
    fontWeight: '700',
  },
  saveBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(89, 152, 222, 0.1)',
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  packageDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  buyButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buyButtonDisabled: {
    opacity: 0.6,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  purchasingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footerNote: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
  },
});

