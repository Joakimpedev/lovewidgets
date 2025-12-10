/**
 * Garden Shop Screen
 * Buy plants and stickers for your garden
 */

import { useRouter } from 'expo-router';
import { ArrowLeft, Flower2, Sparkles, Edit, Trash2, Coins } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { getAllThemes, VisualThemeId, ThemeConfig } from '@/constants/ThemeConfig';
import { FlowerTypeId } from '@/constants/FlowerMarket';
import { useAuth } from '@/context/AuthContext';
import { subscribeToUserProfile, UserProfile } from '@/utils/pairing';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import { GardenAssets, hasAsset, UIAssets } from '@/constants/Assets';
import { plantFlower, removeAllLandmarksWithRefund, removeAllPlantsWithRefund, removeAllDecorWithRefund, subscribeToSharedGardenState, PlantedLandmark, PlantedFlower, PlantedDecor } from '@/utils/gardenState';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING * 3) / 2; // 2 columns with padding

// ============================================
// PLANT DATA
// ============================================

interface PlantItem {
  id: string;
  name: string;
  cost: number;
  asset?: any; // For future use with actual assets
  available: boolean; // Whether the plant can be purchased
}

const PLANTS: PlantItem[] = [
  { id: 'rose', name: 'Rose', cost: 3, available: true, asset: GardenAssets.rose.v2.fresh },
  { id: 'tulip', name: 'Tulip', cost: 5, available: true, asset: GardenAssets.tulip.v2.fresh },
  { id: 'morning_glory', name: 'Morning Glory', cost: 7, available: true, asset: GardenAssets.morning_glory.v2.fresh },
  { id: 'orchid', name: 'Orchid', cost: 10, available: true, asset: GardenAssets.orchid.v2.fresh },
  { id: 'pumpkin', name: 'Pumpkin', cost: 14, available: true, asset: GardenAssets.pumpkin.v2.fresh },
  { id: 'watermelon', name: 'Watermelon', cost: 12, available: true, asset: GardenAssets.watermelon.v2.fresh },
  { id: 'strawberry', name: 'Strawberry', cost: 9, available: true, asset: GardenAssets.strawberry.v2.fresh },
  { id: 'apple_tree', name: 'Apple Tree', cost: 20, available: true, asset: GardenAssets.apple_tree.v2.fresh },
].sort((a, b) => a.cost - b.cost);

// Landmark items - horizon decorations
interface LandmarkItem {
  id: string;
  name: string;
  cost: number;
  asset?: any; // For future use with actual assets
  available: boolean;
  itemType: 'landmark'; // Distinguishes from plants
}

const LANDMARKS: LandmarkItem[] = [
  { id: 'mountain', name: 'Mountain', cost: 30, available: true, itemType: 'landmark', asset: GardenAssets.landmarks.mountain },
  { id: 'windmill', name: 'Windmill', cost: 30, available: true, itemType: 'landmark', asset: GardenAssets.landmarks.windmill },
  { id: 'cooling_tower', name: 'Cooling Tower', cost: 30, available: true, itemType: 'landmark', asset: GardenAssets.landmarks.cooling_tower },
].sort((a, b) => a.cost - b.cost);

// Decor items - behave like plants but no sapling stage
// Decor items have NO variants - just decay states (fresh, wilting, wilted)
// Use the fresh version for the shop preview
const DECOR: PlantItem[] = [
  { 
    id: 'birdbath', 
    name: 'Birdbath', 
    cost: 20, 
    available: true, 
    asset: GardenAssets.birdbath.fresh 
  },
  { 
    id: 'garden_gnome', 
    name: 'Garden Gnome', 
    cost: 15, 
    available: true, 
    asset: GardenAssets.garden_gnome.fresh 
  },
  { 
    id: 'pink_flamingo', 
    name: 'Pink Flamingo', 
    cost: 22, 
    available: true, 
    asset: GardenAssets.pink_flamingo.fresh 
  },
  { 
    id: 'pond', 
    name: 'Pond', 
    cost: 20, 
    available: true, 
    asset: GardenAssets.pond.fresh 
  },
  { 
    id: 'telescope', 
    name: 'Telescope', 
    cost: 25, 
    available: true, 
    asset: GardenAssets.telescope.fresh 
  },
  { 
    id: 'campfire', 
    name: 'Campfire', 
    cost: 22, 
    available: true, 
    asset: GardenAssets.campfire.fresh 
  },
  { 
    id: 'lawnchair', 
    name: 'Lawn Chair', 
    cost: 18, 
    available: true, 
    asset: GardenAssets.lawnchair.fresh 
  },
].sort((a, b) => a.cost - b.cost);

// ============================================
// PLANT CARD COMPONENT
// ============================================

function PlantCard({
  plant,
  colors,
  onPress,
  userGold,
}: {
  plant: PlantItem;
  colors: typeof Colors.light;
  onPress: () => void;
  userGold: number;
}) {
  const canAfford = userGold >= plant.cost;
  const isAvailable = plant.available;

  return (
    <TouchableOpacity
      style={[
        styles.plantCard,
        { backgroundColor: colors.cardBackground },
        !isAvailable && styles.plantCardDisabled,
      ]}
      onPress={isAvailable ? onPress : undefined}
      activeOpacity={isAvailable ? 0.8 : 1}
      disabled={!isAvailable}
    >
      {/* Title Section - Separate section above image */}
      <View style={[styles.titleSection, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.titleBadgeText, { color: colors.text }]} numberOfLines={1}>
          {plant.name}
        </Text>
      </View>

      {/* Plant Image */}
      <View style={[styles.plantImageContainer, { backgroundColor: colors.highlight }]}>
        {plant.asset ? (
          <Image source={plant.asset} style={styles.plantImage} resizeMode="contain" />
        ) : (
          <Flower2 size={48} color={colors.tint} strokeWidth={2} />
        )}
        {!isAvailable && (
          <View style={styles.comingSoonOverlay}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        )}
      </View>

      {/* Price Button - Full width below */}
      <TouchableOpacity
        style={[
          styles.priceButton,
          { backgroundColor: canAfford && isAvailable ? colors.tint : colors.textSecondary },
        ]}
        onPress={(e) => {
          e.stopPropagation();
          if (isAvailable) onPress();
        }}
        activeOpacity={0.8}
        disabled={!isAvailable || !canAfford}
      >
        <View style={styles.priceTextContainer}>
          <Text style={styles.priceText}>{plant.cost}</Text>
          {hasAsset(UIAssets.coin) ? (
            <Image source={UIAssets.coin} style={styles.priceIcon} resizeMode="contain" />
          ) : (
            <Text style={styles.priceText}>💰</Text>
          )}
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ============================================
// THEMES TAB COMPONENT
// ============================================

function ThemesTab({ colors }: { colors: typeof Colors.light }) {
  const { visualThemeId, setVisualTheme } = useTheme();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const themes = getAllThemes();

  // Subscribe to user profile to check owned themes
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserProfile(user.uid, (profile) => {
      setUserProfile(profile);
    });
    return () => unsubscribe();
  }, [user]);

  const ownedThemes = userProfile?.ownedThemes || ['default']; // Default theme is always owned
  const userGold = userProfile?.wallet?.gold || 0;

  const handleSelectTheme = async (themeId: VisualThemeId) => {
    // Check if theme is owned
    if (!ownedThemes.includes(themeId)) {
      console.log('[Shop] Theme not owned:', themeId);
      return;
    }
    await setVisualTheme(themeId);
  };

  const handlePurchaseTheme = async (theme: ThemeConfig) => {
    if (!user || !theme.cost) return;

    try {
      // Read fresh wallet data
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        console.error('[Shop] User document not found');
        return;
      }

      const userData = userDocSnap.data() as UserProfile;
      const currentWallet = userData.wallet || { gold: 0, water: 0, maxWater: 3 };
      const currentGold = currentWallet.gold || 0;
      const currentOwnedThemes = userData.ownedThemes || ['default'];

      // Check if user has enough gold
      if (currentGold < theme.cost) {
        console.log('[Shop] Not enough gold. Current:', currentGold, 'Required:', theme.cost);
        return;
      }

      // Check if already owned
      if (currentOwnedThemes.includes(theme.id)) {
        console.log('[Shop] Theme already owned:', theme.id);
        await setVisualTheme(theme.id);
        return;
      }

      // Deduct gold and add theme to owned list
      await updateDoc(userDocRef, {
        'wallet.gold': currentGold - theme.cost,
        'ownedThemes': [...currentOwnedThemes, theme.id],
        updatedAt: serverTimestamp(),
      });

      console.log('[Shop] ✅ Purchased theme:', theme.id, 'for', theme.cost, 'gold');
      
      // Automatically activate the theme after purchase
      await setVisualTheme(theme.id);
    } catch (error) {
      console.error('[Shop] Purchase error:', error);
    }
  };

  return (
    <View style={styles.themesContainer}>
      {themes.map((theme) => {
        const isActive = visualThemeId === theme.id;
        const isOwned = ownedThemes.includes(theme.id);
        const canAfford = theme.cost ? userGold >= theme.cost : true;

        return (
          <View
            key={theme.id}
            style={[
              styles.themeCard,
              { backgroundColor: colors.cardBackground },
              isActive && { borderColor: colors.tint, borderWidth: 2 },
            ]}
          >
            <TouchableOpacity
              onPress={() => isOwned ? handleSelectTheme(theme.id) : undefined}
              activeOpacity={0.8}
              disabled={!isOwned}
            >
              <View style={[styles.themePreview, { backgroundColor: colors.highlight }]}>
                {theme.previewImage ? (
                  <Image 
                    source={theme.previewImage} 
                    style={styles.themePreviewImage} 
                    resizeMode="cover" 
                  />
                ) : theme.backgroundImage ? (
                  <Image 
                    source={theme.backgroundImage} 
                    style={styles.themePreviewImage} 
                    resizeMode="cover" 
                  />
                ) : (
                  <View style={styles.themePreviewPlaceholder}>
                    <Text style={styles.themePreviewText}>🎨</Text>
                  </View>
                )}
              </View>
              <View style={styles.themeInfo}>
                <Text style={[styles.themeName, { color: colors.text }]}>{theme.name}</Text>
                <Text style={[styles.themeDescription, { color: colors.textSecondary }]}>
                  {theme.description}
                </Text>
              </View>
              {isActive && isOwned && (
                <View style={[styles.activeBadge, { backgroundColor: colors.tint }]}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* Purchase/Select Button */}
            {!isOwned && theme.cost ? (
              <TouchableOpacity
                style={[
                  styles.themePurchaseButton,
                  { backgroundColor: canAfford ? colors.tint : colors.textSecondary },
                ]}
                onPress={() => handlePurchaseTheme(theme)}
                activeOpacity={0.8}
                disabled={!canAfford}
              >
                <View style={styles.priceTextContainer}>
                  <Text style={styles.priceText}>{theme.cost}</Text>
                  {hasAsset(UIAssets.coin) ? (
                    <Image source={UIAssets.coin} style={styles.priceIcon} resizeMode="contain" />
                  ) : (
                    <Text style={styles.priceText}>💰</Text>
                  )}
                </View>
              </TouchableOpacity>
            ) : isOwned && !isActive ? (
              <TouchableOpacity
                style={[styles.themeSelectButton, { backgroundColor: colors.tint }]}
                onPress={() => handleSelectTheme(theme.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.themeSelectButtonText}>Select</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function ShopScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];
  
  const [activeTab, setActiveTab] = useState<'plants' | 'decor' | 'landmarks' | 'themes'>('plants');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [landmarks, setLandmarks] = useState<PlantedLandmark[]>([]);
  const [flowers, setFlowers] = useState<PlantedFlower[]>([]);
  const [decor, setDecor] = useState<PlantedDecor[]>([]);

  // Subscribe to user profile for wallet updates
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserProfile(user.uid, (profile) => {
      setUserProfile(profile);
    });
    return () => unsubscribe();
  }, [user]);

  // Subscribe to garden state for landmarks, flowers, and decor
  useEffect(() => {
    if (!user || !userProfile?.partnerId) return;
    const unsubscribe = subscribeToSharedGardenState(
      user.uid,
      userProfile.partnerId,
      (state) => {
        setLandmarks(state.landmarks || []);
        setFlowers(state.flowers || []);
        setDecor(state.decor || []);
      }
    );
    return () => unsubscribe();
  }, [user, userProfile?.partnerId]);

  const userGold = userProfile?.wallet?.gold || 0;

  const handleBuyPlant = async (plant: PlantItem) => {
    if (!user || !plant.available) return;

    try {
      // Read fresh wallet data from Firestore to check affordability
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        console.error('[Shop] User document not found');
        return;
      }

      const userData = userDocSnap.data() as UserProfile;
      const currentWallet = userData.wallet || { gold: 0, water: 0, maxWater: 3 };
      const currentGold = currentWallet.gold || 0;

      // Check if user has enough gold (but don't deduct yet)
      if (currentGold < plant.cost) {
        console.log('[Shop] Not enough gold. Current:', currentGold, 'Required:', plant.cost);
        return;
      }

      // Check if user has partner (needed for planting)
      if (!userProfile?.partnerId) {
        console.log('[Shop] No partner - cannot plant');
        // Could show an error message here
        return;
      }

      console.log('[Shop] ✅ Selected', plant.name, 'for', plant.cost, 'gold. Redirecting to placement...');

      // Close shop and redirect to home screen with pending item
      // Gold will be deducted only when user confirms placement
      router.push({
        pathname: '/(tabs)/' as any,
        params: { 
          pendingItemType: plant.id,
          pendingItemCost: plant.cost.toString(),
          pendingItemCategory: 'flower', // Mark as flower type
        },
      });
    } catch (error) {
      console.error('[Shop] Purchase error:', error);
    }
  };

  const handleBuyDecor = async (decor: PlantItem) => {
    if (!user || !decor.available) return;

    try {
      // Read fresh wallet data from Firestore to check affordability
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        console.error('[Shop] User document not found');
        return;
      }

      const userData = userDocSnap.data() as UserProfile;
      const currentWallet = userData.wallet || { gold: 0, water: 0, maxWater: 3 };
      const currentGold = currentWallet.gold || 0;

      // Check if user has enough gold (but don't deduct yet)
      if (currentGold < decor.cost) {
        console.log('[Shop] Not enough gold. Current:', currentGold, 'Required:', decor.cost);
        return;
      }

      // Check if user has partner (needed for planting)
      if (!userProfile?.partnerId) {
        console.log('[Shop] No partner - cannot plant');
        return;
      }

      console.log('[Shop] ✅ Selected decor', decor.name, 'for', decor.cost, 'gold. Redirecting to placement...');

      // Close shop and redirect to home screen with pending item
      // Gold will be deducted only when user confirms placement
      router.push({
        pathname: '/(tabs)/' as any,
        params: { 
          pendingItemType: decor.id,
          pendingItemCost: decor.cost.toString(),
          pendingItemCategory: 'decor', // Mark as decor type
        },
      });
    } catch (error) {
      console.error('[Shop] Purchase error:', error);
    }
  };

  const handleRemoveAllLandmarks = async () => {
    if (!user || !userProfile?.partnerId || landmarks.length === 0) return;

    // Calculate refund amount (60% of total cost)
    let totalCost = 0;
    for (const landmark of landmarks) {
      const cost = LANDMARKS.find(l => l.id === landmark.type)?.cost || 0;
      totalCost += cost;
    }
    const refundAmount = Math.floor(totalCost * 0.6);

    Alert.alert(
      'Sell All Landmarks',
      `You will receive ${refundAmount} gold. This is 60% of the original value. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sell',
          style: 'default',
          onPress: async () => {
            try {
              const result = await removeAllLandmarksWithRefund(user.uid, userProfile.partnerId);
              Alert.alert(
                'Landmarks Sold',
                `All landmarks have been sold. You received ${result.refundAmount} gold.`
              );
            } catch (error) {
              console.error('[Shop] Error removing landmarks:', error);
              Alert.alert('Error', 'Failed to sell landmarks. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleRemoveAllPlants = async () => {
    if (!user || !userProfile?.partnerId || flowers.length === 0) return;

    // Calculate refund amount (60% of total cost)
    let totalCost = 0;
    for (const flower of flowers) {
      const cost = PLANTS.find(p => p.id === flower.type)?.cost || 0;
      totalCost += cost;
    }
    const refundAmount = Math.floor(totalCost * 0.6);

    Alert.alert(
      'Sell All Plants',
      `You will receive ${refundAmount} gold. This is 60% of the original value. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sell',
          style: 'default',
          onPress: async () => {
            try {
              const result = await removeAllPlantsWithRefund(user.uid, userProfile.partnerId);
              Alert.alert(
                'Plants Sold',
                `All plants have been sold. You received ${result.refundAmount} gold.`
              );
            } catch (error) {
              console.error('[Shop] Error removing plants:', error);
              Alert.alert('Error', 'Failed to sell plants. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleRemoveAllDecor = async () => {
    if (!user || !userProfile?.partnerId || decor.length === 0) return;

    // Calculate refund amount (60% of total cost)
    let totalCost = 0;
    for (const decorItem of decor) {
      const cost = DECOR.find(d => d.id === decorItem.type)?.cost || 0;
      totalCost += cost;
    }
    const refundAmount = Math.floor(totalCost * 0.6);

    Alert.alert(
      'Sell All Decor',
      `You will receive ${refundAmount} gold. This is 60% of the original value. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sell',
          style: 'default',
          onPress: async () => {
            try {
              const result = await removeAllDecorWithRefund(user.uid, userProfile.partnerId);
              Alert.alert(
                'Decor Sold',
                `All decor items have been sold. You received ${result.refundAmount} gold.`
              );
            } catch (error) {
              console.error('[Shop] Error removing decor:', error);
              Alert.alert('Error', 'Failed to sell decor. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleBuyLandmark = async (landmark: LandmarkItem) => {
    if (!user || !landmark.available) return;

    try {
      // Read fresh wallet data from Firestore to check affordability
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        console.error('[Shop] User document not found');
        return;
      }

      const userData = userDocSnap.data() as UserProfile;
      const currentWallet = userData.wallet || { gold: 0, water: 0, maxWater: 3 };
      const currentGold = currentWallet.gold || 0;

      // Check if user has enough gold (but don't deduct yet)
      if (currentGold < landmark.cost) {
        console.log('[Shop] Not enough gold. Current:', currentGold, 'Required:', landmark.cost);
        return;
      }

      // Check if user has partner (needed for planting)
      if (!userProfile?.partnerId) {
        console.log('[Shop] No partner - cannot plant');
        return;
      }

      console.log('[Shop] ✅ Selected landmark', landmark.name, 'for', landmark.cost, 'gold. Redirecting to placement...');

      // Close shop and redirect to home screen with pending item
      // Gold will be deducted only when user confirms placement
      router.push({
        pathname: '/(tabs)/' as any,
        params: { 
          pendingItemType: landmark.id,
          pendingItemCost: landmark.cost.toString(),
          pendingItemCategory: 'landmark', // Mark as landmark type
        },
      });
    } catch (error) {
      console.error('[Shop] Purchase error:', error);
    }
  };

  const renderPlantItem = ({ item }: { item: PlantItem }) => (
    <PlantCard 
      plant={item} 
      colors={colors} 
      onPress={() => handleBuyPlant(item)}
      userGold={userGold}
    />
  );

  const renderLandmarkItem = ({ item }: { item: LandmarkItem }) => (
    <PlantCard 
      plant={item as any} 
      colors={colors} 
      onPress={() => handleBuyLandmark(item)}
      userGold={userGold}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Market</Text>
        <View style={styles.currencyContainer}>
          {hasAsset(UIAssets.coin) ? (
            <Image source={UIAssets.coin} style={styles.headerCoinIcon} resizeMode="contain" />
          ) : null}
          <Text style={[styles.currencyText, { color: colors.text }]}>{userGold}</Text>
        </View>
      </View>

      {/* Main Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'plants' && [styles.activeTab, { backgroundColor: colors.tint }],
          ]}
          onPress={() => setActiveTab('plants')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'plants' ? '#FFFFFF' : colors.text },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            Plants
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'decor' && [styles.activeTab, { backgroundColor: colors.tint }],
          ]}
          onPress={() => setActiveTab('decor')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'decor' ? '#FFFFFF' : colors.text },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            Decor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'landmarks' && [styles.activeTab, { backgroundColor: colors.tint }],
          ]}
          onPress={() => setActiveTab('landmarks')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'landmarks' ? '#FFFFFF' : colors.text },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            Landmarks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'themes' && [styles.activeTab, { backgroundColor: colors.tint }],
          ]}
          onPress={() => setActiveTab('themes')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'themes' ? '#FFFFFF' : colors.text },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            Themes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'plants' ? (
          <View style={styles.gardenTabContainer}>
            {/* Sell All Plants Button */}
            {flowers.length > 0 && (() => {
              // Calculate refund amount for display
              let totalCost = 0;
              for (const flower of flowers) {
                const cost = PLANTS.find(p => p.id === flower.type)?.cost || 0;
                totalCost += cost;
              }
              const refundAmount = Math.floor(totalCost * 0.6);
              
              return (
                <TouchableOpacity
                  style={[styles.sellButton, { backgroundColor: '#D4A853' }]}
                  onPress={handleRemoveAllPlants}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sellButtonText}>Sell All Plants</Text>
                  <View style={styles.refundAmountContainer}>
                    {hasAsset(UIAssets.coin) && (
                      <Image source={UIAssets.coin} style={styles.refundCoinIcon} resizeMode="contain" />
                    )}
                    <Text style={styles.refundAmountText}>{refundAmount}</Text>
                  </View>
                </TouchableOpacity>
              );
            })()}
            <FlatList
              data={PLANTS}
              renderItem={renderPlantItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContainer}
            />
          </View>
        ) : activeTab === 'decor' ? (
          <View style={styles.gardenTabContainer}>
            {/* Sell All Decor Button */}
            {decor.length > 0 && (() => {
              // Calculate refund amount for display
              let totalCost = 0;
              for (const decorItem of decor) {
                const cost = DECOR.find(d => d.id === decorItem.type)?.cost || 0;
                totalCost += cost;
              }
              const refundAmount = Math.floor(totalCost * 0.6);
              
              return (
                <TouchableOpacity
                  style={[styles.sellButton, { backgroundColor: '#D4A853' }]}
                  onPress={handleRemoveAllDecor}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sellButtonText}>Sell All Decor</Text>
                  <View style={styles.refundAmountContainer}>
                    {hasAsset(UIAssets.coin) && (
                      <Image source={UIAssets.coin} style={styles.refundCoinIcon} resizeMode="contain" />
                    )}
                    <Text style={styles.refundAmountText}>{refundAmount}</Text>
                  </View>
                </TouchableOpacity>
              );
            })()}
            <FlatList
              data={DECOR}
              renderItem={({ item }) => (
                <PlantCard 
                  plant={item} 
                  colors={colors} 
                  onPress={() => handleBuyDecor(item)}
                  userGold={userGold}
                />
              )}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContainer}
            />
          </View>
        ) : activeTab === 'landmarks' ? (
          <View style={styles.landmarksTabContainer}>
            {/* Sell All Landmarks Button */}
            {landmarks.length > 0 && (() => {
              // Calculate refund amount for display
              let totalCost = 0;
              for (const landmark of landmarks) {
                const cost = LANDMARKS.find(l => l.id === landmark.type)?.cost || 0;
                totalCost += cost;
              }
              const refundAmount = Math.floor(totalCost * 0.6);
              
              return (
                <TouchableOpacity
                  style={[styles.sellButton, { backgroundColor: '#D4A853' }]}
                  onPress={handleRemoveAllLandmarks}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sellButtonText}>Sell All Landmarks</Text>
                  <View style={styles.refundAmountContainer}>
                    {hasAsset(UIAssets.coin) && (
                      <Image source={UIAssets.coin} style={styles.refundCoinIcon} resizeMode="contain" />
                    )}
                    <Text style={styles.refundAmountText}>{refundAmount}</Text>
                  </View>
                </TouchableOpacity>
              );
            })()}
            <FlatList
              data={LANDMARKS}
              renderItem={renderLandmarkItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContainer}
            />
          </View>
        ) : (
          <ThemesTab colors={colors} />
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

// ============================================
// PURCHASE MODAL COMPONENT
// ============================================

function PurchaseModal({
  plant,
  colors,
  onPlant,
  onClose,
}: {
  plant: PlantItem;
  colors: typeof Colors.light;
  onPlant: () => void;
  onClose: () => void;
}) {
  const scale = useSharedValue(0);

  useEffect(() => {
    // Simple ease animation: 0 → 1.1 → 1.0
    scale.value = withSequence(
      withTiming(1.1, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(1.0, { duration: 150, easing: Easing.in(Easing.quad) })
    );
  }, []);

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.modalOverlay}>
      <Animated.View style={[styles.modalContent, { backgroundColor: colors.cardBackground }, modalStyle]}>
        {/* Starburst Effect - Behind the content */}
        <View style={styles.starburst} pointerEvents="none">
          <Sparkles size={80} color="#FFD700" strokeWidth={2} />
        </View>

        {/* Plant Image */}
        <View style={styles.modalImageContainer}>
          {plant.asset ? (
            <Image source={plant.asset} style={styles.modalPlantImage} resizeMode="contain" />
          ) : (
            <Flower2 size={64} color={colors.tint} strokeWidth={2} />
          )}
        </View>

        {/* Text */}
        <Text style={[styles.modalTitle, { color: colors.text }]}>Purchased!</Text>
        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
          You bought a {plant.name}!
        </Text>

        {/* Plant Button */}
        <TouchableOpacity
          style={[styles.plantButton, { backgroundColor: colors.tint }]}
          onPress={onPlant}
          activeOpacity={0.8}
        >
          <Text style={styles.plantButtonText}>Plant 🌱</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

// Platform-specific shadow styles
const platformShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  android: {
    elevation: 3,
  },
});

const platformShadowLarge = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  android: {
    elevation: 12,
  },
});

const platformShadowGold = Platform.select({
  ios: {
    shadowColor: '#D4A853',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  android: {
    elevation: 4,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    position: 'relative',
  },
  backButton: {
    padding: 4,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 0,
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  headerCoinIcon: {
    width: 20,
    height: 20,
  },
  currencyText: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 6,
    flexWrap: 'nowrap',
  },
  tab: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: Colors.light.tint,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  subTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeSubTab: {
    backgroundColor: Colors.light.tint,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: GRID_PADDING,
  },
  gridContainer: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: GRID_PADDING,
  },
  plantCard: {
    width: GRID_ITEM_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    ...platformShadow,
  },
  titleSection: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  titleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  plantImageContainer: {
    width: '100%',
    height: GRID_ITEM_SIZE * 0.65,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.highlight,
    position: 'relative',
  },
  priceButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  priceTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  priceIcon: {
    width: 20,
    height: 20,
  },
  comingSoonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 16,
  },
  plantCardDisabled: {
    opacity: 0.6,
  },
  comingSoonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  comingSoonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  plantImage: {
    width: '80%',
    height: '80%',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.8,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...platformShadowLarge,
  },
  starburst: {
    position: 'absolute',
    top: -40,
    left: '50%',
    marginLeft: -40, // Half of icon size (80/2) to center
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1, // Behind the content
  },
  modalImageContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalPlantImage: {
    width: '100%',
    height: '100%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  plantButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  plantButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  themesContainer: {
    paddingVertical: 8,
  },
  themeCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
    ...platformShadow,
  },
  themePreview: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themePreviewImage: {
    width: '100%',
    height: '100%',
  },
  themePreviewPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themePreviewText: {
    fontSize: 48,
  },
  themeInfo: {
    padding: 16,
  },
  themeName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 14,
  },
  activeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  themePurchaseButton: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeSelectButton: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeSelectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  landmarksTabContainer: {
    flex: 1,
  },
  gardenTabContainer: {
    flex: 1,
  },
  removeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  removeAllButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sellButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
    ...platformShadowGold,
  },
  sellButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  refundAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  refundAmountText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  refundCoinIcon: {
    width: 18,
    height: 18,
  },
});

