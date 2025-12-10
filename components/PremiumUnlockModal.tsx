/**
 * Premium Unlock Modal
 * Shows premium plans and handles purchase flow
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Star } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/context/ThemeContext';
import { PREMIUM_PLANS, type IAPProductId } from '@/constants/IAPProducts';
import {
  getAvailableProducts,
  purchaseProduct,
  restorePurchases,
  formatPrice,
  type IAPProduct,
} from '@/utils/iapService';
import * as Haptics from 'expo-haptics';

// ============================================
// TYPES
// ============================================

interface PremiumUnlockModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

interface PremiumFeature {
  icon: string; // Image path
  title: string;
  description: string;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    icon: require('@/assets/icons/ui/doodle.png'),
    title: 'Shared Doodle',
    description: 'Draw together in real-time',
  },
  {
    icon: require('@/assets/icons/ui/coin.png'),
    title: 'Double Coins',
    description: 'Earn 2x coins from activities',
  },
  {
    icon: require('@/assets/icons/ui/heart.png'),
    title: 'More Affections',
    description: 'Unlock exclusive affection types',
  },
  {
    icon: require('@/assets/icons/ui/moon.png'),
    title: 'Space Theme',
    description: 'Beautiful space-themed garden',
  },
];

// ============================================
// COMPONENT
// ============================================

export function PremiumUnlockModal({
  visible,
  onClose,
  onPurchaseComplete,
}: PremiumUnlockModalProps) {
  const colorScheme = useColorScheme();
  const { themeId, colors: themeColors } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];
  const { user } = useAuth();

  // Initialize with default prices from PREMIUM_PLANS
  const [products, setProducts] = useState<IAPProduct[]>(
    PREMIUM_PLANS.map((plan) => ({
      productId: plan.id,
      price: plan.price || '$0.00',
      title: plan.name,
      description: plan.description,
      currency: 'USD',
    }))
  );
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Load products when modal opens
  useEffect(() => {
    if (visible) {
      loadProducts();
    }
  }, [visible]);

  async function loadProducts() {
    setLoading(true);
    try {
      const availableProducts = await getAvailableProducts();
      
      console.log('[PremiumModal] Available products from store:', availableProducts.length);
      
      // Map store products to our plan structure
      // Use default prices from PREMIUM_PLANS if products aren't loaded
      const mappedProducts: IAPProduct[] = PREMIUM_PLANS.map((plan) => {
        const storeProduct = availableProducts.find((p) => p.productId === plan.id);
        return {
          productId: plan.id,
          price: storeProduct?.price || plan.price || '$0.00',
          title: plan.name,
          description: plan.description,
          currency: storeProduct?.currency || 'USD',
        };
      });

      console.log('[PremiumModal] Mapped products:', mappedProducts.length);
      setProducts(mappedProducts as any);
    } catch (error) {
      console.error('[PremiumModal] Error loading products:', error);
      // Show plans with default prices even if loading failed
      const mappedProducts: IAPProduct[] = PREMIUM_PLANS.map((plan) => ({
        productId: plan.id,
        price: plan.price || '$0.00',
        title: plan.name,
        description: plan.description,
        currency: 'USD',
      }));
      setProducts(mappedProducts as any);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(productId: IAPProductId) {
    if (!user) {
      Alert.alert('Error', 'Please sign in to purchase premium');
      return;
    }

    setPurchasing(productId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await purchaseProduct(productId, user.uid);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success!', 'Welcome to Premium! Enjoy all the features.', [
          {
            text: 'Awesome!',
            onPress: () => {
              onPurchaseComplete?.();
              onClose();
            },
          },
        ]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (result.error !== 'Purchase canceled') {
          Alert.alert('Purchase Failed', result.error || 'Something went wrong. Please try again.');
        }
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  }

  async function handleRestore() {
    if (!user) {
      Alert.alert('Error', 'Please sign in to restore purchases');
      return;
    }

    setRestoring(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await restorePurchases(user.uid);

      if (result.success) {
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  }

  const popularPlan = PREMIUM_PLANS.find((p) => p.popular);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          {/* Header - Just close button */}
          <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
            <View style={styles.headerSpacer} />
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
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Bee Mascot with Mail */}
            <View style={styles.beeContainer}>
              <Image 
                source={require('@/assets/bee/mail_deliver.png')} 
                style={styles.beeImage}
                resizeMode="contain"
              />
            </View>

            {/* Premium Title - Prominent */}
            <View style={styles.premiumTitleContainer}>
              <Image 
                source={require('@/assets/icons/ui/premium.png')} 
                style={styles.premiumTitleIcon}
                resizeMode="contain"
              />
              <Text style={[styles.premiumTitle, { color: colors.text }]}>Unlock Premium</Text>
            </View>

            {/* Plans - Payment Buttons at Top */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading plans...
                </Text>
              </View>
            ) : (
              <View style={styles.plansSection}>
                {products.map((product: any) => {
                  const plan = PREMIUM_PLANS.find((p) => p.id === product.productId);
                  if (!plan) return null;
                  
                  const isPopular = plan.popular;
                  const isPurchasing = purchasing === plan.id;
                  // Always show products, even with default prices
                  const hasPrice = product.price && product.price !== 'Not Available' && product.price !== 'Error Loading' && product.price !== '$0.00';

                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planCard,
                        isPopular && styles.planCardPopular,
                        { backgroundColor: colors.background, borderColor: colors.border },
                        isPopular && { borderColor: colors.tint },
                        !hasPrice && styles.planCardDisabled,
                      ]}
                      onPress={() => handlePurchase(plan.id)}
                      disabled={isPurchasing || !hasPrice}
                      activeOpacity={0.8}
                    >
                      {isPopular && (
                        <View style={[styles.popularBadge, { backgroundColor: colors.tint }]}>
                          <Star size={10} color="#FFFFFF" fill="#FFFFFF" />
                          <Text style={styles.popularText}>POPULAR</Text>
                        </View>
                      )}

                      <View style={styles.planHeader}>
                        <Text style={[styles.planName, { color: colors.text }]}>
                          {plan.name}
                        </Text>
                        {hasPrice ? (
                          <Text style={[styles.planPrice, { color: colors.tint }]}>
                            {formatPrice(product.price, product.currency)}
                          </Text>
                        ) : (
                          <Text style={[styles.planPrice, { color: colors.textSecondary }]}>
                            {product.price || 'Not Available'}
                          </Text>
                        )}
                      </View>

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

            {/* Features List - Compact */}
            <View style={styles.featuresSection}>
              <Text style={[styles.featuresTitle, { color: colors.text }]}>Premium Features</Text>
              <View style={styles.featuresGrid}>
                {PREMIUM_FEATURES.map((feature, index) => (
                  <View key={index} style={[styles.featureItem, { backgroundColor: colors.background }]}>
                    <Image 
                      source={feature.icon} 
                      style={styles.featureIconImage}
                      resizeMode="contain"
                    />
                    <View style={styles.featureTextContainer}>
                      <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                      <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                        {feature.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Restore Purchases */}
            <TouchableOpacity
              onPress={handleRestore}
              disabled={restoring}
              style={styles.restoreButton}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
                  Restore Purchases
                </Text>
              )}
            </TouchableOpacity>

            {/* Footer Note */}
            <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
              Payment will be charged to your {Platform.OS === 'ios' ? 'Apple' : 'Google'} account.
              Subscription automatically renews unless canceled.
            </Text>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
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
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 20,
  },
  headerSpacer: {
    flex: 1,
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
  content: {
    padding: 20,
    paddingBottom: 20,
  },
  beeContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  beeImage: {
    width: 120,
    height: 120,
  },
  premiumTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  premiumTitleIcon: {
    width: 32,
    height: 32,
  },
  premiumTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  plansSection: {
    marginBottom: 20,
  },
  featuresSection: {
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  featuresGrid: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  featureIconImage: {
    width: 32,
    height: 32,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  planCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 10,
    position: 'relative',
  },
  planCardPopular: {
    borderWidth: 2,
  },
  planCardDisabled: {
    opacity: 0.5,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
  },
  planPrice: {
    fontSize: 18,
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
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  restoreText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  footerNote: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 4,
  },
});

