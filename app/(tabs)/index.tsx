/**
 * Home Screen - Scattered Icons with Garden
 * 
 * Clean, playful design with scattered action icons:
 * - Send Love → upper left area
 * - Activities → lower right area
 * 
 * Garden takes up the bottom portion of the screen
 */

import { useRouter } from 'expo-router';
import { Moon, Heart, Flame, Link2, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { subscribeToUserProfile, UserProfile } from '@/utils/pairing';
import { useGardenStatus } from '@/hooks/useGardenStatus';
import { Garden } from '@/components/Garden';
import { LevelUpModal } from '@/components/LevelUpModal';
import { HubAssets, hasAsset } from '@/constants/Assets';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Profile photo size (40% of screen width for significant space)
const PROFILE_PHOTO_SIZE = SCREEN_WIDTH * 0.4;

// Icon sizes
const HUB_ICON_SIZE = 80;

// ============================================
// HEADER COMPONENT
// ============================================

function HeaderStats({
  colors,
  hearts,
  streak,
  daysConnected,
}: {
  colors: typeof Colors.light;
  hearts: number;
  streak: number;
  daysConnected: number;
}) {
  return (
    <View style={styles.headerContainer}>
      {/* Left: Hearts & Streak */}
      <View style={styles.statsRow}>
        <View style={[styles.statBadge, { backgroundColor: colors.cardBackground }]}>
          <Heart size={16} color={colors.secondaryTint} fill={colors.secondaryTint} />
          <Text style={[styles.statText, { color: colors.text }]}>{hearts}</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: colors.cardBackground }]}>
          <Flame size={16} color={colors.streakFire} />
          <Text style={[styles.statText, { color: colors.text }]}>{streak}</Text>
        </View>
      </View>

      {/* Center: Title */}
      <Text style={[styles.homeTitle, { color: colors.text }]}>Our Space</Text>

      {/* Right: Days Connected with Moon */}
      <View style={[styles.daysConnectedBadge, { backgroundColor: colors.cardBackground }]}>
        <Moon size={16} color={colors.tint} />
        <Text style={[styles.daysText, { color: colors.text }]}>{daysConnected}d</Text>
      </View>
    </View>
  );
}

// ============================================
// COUPLE SECTION (Profile Photos with Link)
// ============================================

interface CoupleSectionProps {
  myPhotoURL: string | null | undefined;
  myDisplayName: string; // My name or nickname from partner
  partnerPhotoURL: string | null | undefined;
  partnerDisplayName: string; // Partner name or nickname I gave them
  colors: typeof Colors.light;
}

function CoupleSection({ myPhotoURL, myDisplayName, partnerPhotoURL, partnerDisplayName, colors }: CoupleSectionProps) {
  return (
    <View style={styles.coupleSection}>
      {/* My Profile */}
      <View style={styles.profileContainer}>
        <View style={[styles.profileCircle, { backgroundColor: colors.tint + '15' }]}>
          {myPhotoURL ? (
            <Image 
              source={{ uri: myPhotoURL }} 
              style={styles.profilePhoto}
              resizeMode="cover"
              onError={(error) => {
                console.log('Error loading my photo:', error);
              }}
            />
          ) : (
            <User size={PROFILE_PHOTO_SIZE * 0.4} color={colors.tint} />
          )}
        </View>
        <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
          {myDisplayName}
        </Text>
      </View>

      {/* Link Icon (Chain) */}
      <View style={[styles.linkIconContainer, { backgroundColor: colors.highlight, borderColor: colors.tint + '40' }]}>
        <Link2 size={24} color={colors.tint} strokeWidth={2.5} />
      </View>

      {/* Partner Profile */}
      <View style={styles.profileContainer}>
        <View style={[styles.profileCircle, { backgroundColor: colors.tint + '15' }]}>
          {partnerPhotoURL ? (
            <Image 
              source={{ uri: partnerPhotoURL }} 
              style={styles.profilePhoto}
              resizeMode="cover"
              onError={(error) => {
                console.log('Error loading partner photo:', error);
              }}
            />
          ) : (
            <User size={PROFILE_PHOTO_SIZE * 0.4} color={colors.tint} />
          )}
        </View>
        <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
          {partnerDisplayName}
        </Text>
      </View>
    </View>
  );
}

// ============================================
// SCATTERED ICON COMPONENT
// ============================================

interface ScatteredIconProps {
  asset?: any;
  filename: string;
  onPress: () => void;
  style?: object;
}

function ScatteredIcon({ asset, filename, onPress, style }: ScatteredIconProps) {
  return (
    <TouchableOpacity
      style={[styles.scatteredIcon, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {hasAsset(asset) ? (
        <Image source={asset} style={styles.iconImage} resizeMode="contain" />
      ) : (
        <View style={styles.iconPlaceholder}>
          <Text style={styles.placeholderFilename}>{filename}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================
// DEV CONTROLS (For Testing)
// ============================================

function DevControls({
  onAdd6Hours,
  onAdd24Hours,
  onWater,
}: {
  onAdd6Hours: () => void;
  onAdd24Hours: () => void;
  onWater: () => void;
}) {
  return (
    <View style={styles.devContainer}>
      <Text style={styles.devTitle}>🛠️ Dev</Text>
      <View style={styles.devButtonsRow}>
        <TouchableOpacity style={[styles.devButton, { backgroundColor: '#3498DB' }]} onPress={onAdd6Hours}>
          <Text style={styles.devButtonText}>+6h</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.devButton, { backgroundColor: '#9B59B6' }]} onPress={onAdd24Hours}>
          <Text style={styles.devButtonText}>+24h</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.devButton, styles.devButtonSuccess]} onPress={onWater}>
          <Text style={styles.devButtonText}>💧 Water</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Garden Status Hook
  const {
    flowerCount,
    streakProgress,
    health,
    hoursSinceInteraction,
    flowers,
    showLevelUpModal,
    pendingFlowerPicker,
    isMyTurnToPick,
    waterGarden,
    checkAndApplyPunishment,
    selectFlowerForSlot,
    dismissLevelUpModal,
    devAddHours,
    devSimulateSend,
  } = useGardenStatus();

  // Mock data - replace with real data later
  const hearts = 150;
  const streak = flowerCount;
  const daysConnected = 45;

  // Subscribe to user profile
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserProfile(user.uid, (profile) => {
      setUserProfile(profile);
      // Debug: Log photo URLs
      if (profile) {
        console.log('[Home] Profile updated:', {
          hasMyPhoto: !!profile.photoURL,
          hasPartnerPhoto: !!profile.partnerPhotoURL,
          myPhotoLength: profile.photoURL?.length || 0,
          partnerPhotoLength: profile.partnerPhotoURL?.length || 0,
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Check for punishment on mount and periodically (silently)
  useEffect(() => {
    checkAndApplyPunishment();
    const interval = setInterval(checkAndApplyPunishment, 60 * 1000);
    return () => clearInterval(interval);
  }, [checkAndApplyPunishment]);

  const hasPartner = !!userProfile?.partnerId;

  // Navigation handlers
  function handleSendLove() {
    router.push('/send-love-menu');
  }

  function handleActivities() {
    router.push('/activities-menu');
  }

  // Dev handlers
  async function handleDevAdd6Hours() {
    await devAddHours(6);
    await checkAndApplyPunishment();
    console.log('⏰ Added 6 hours');
  }

  async function handleDevAdd24Hours() {
    await devAddHours(24);
    await checkAndApplyPunishment();
    console.log('⏰ Added 24 hours');
  }

  async function handleDevWater() {
    await devSimulateSend();
    console.log('💧 Garden watered');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header Stats */}
      <HeaderStats
        colors={colors}
        hearts={hearts}
        streak={streak}
        daysConnected={daysConnected}
      />

      {/* Main Content Area with Scattered Icons */}
      <View style={styles.mainContent}>
        {/* Couple Section - Only show if connected */}
        {hasPartner && (
          <CoupleSection
            key={`couple-${userProfile?.photoURL ? 'has-photo' : 'no-photo'}-${userProfile?.partnerPhotoURL ? 'has-partner-photo' : 'no-partner-photo'}`}
            myPhotoURL={userProfile?.photoURL}
            myDisplayName={userProfile?.nicknameFromPartner || userProfile?.name || 'You'}
            partnerPhotoURL={userProfile?.partnerPhotoURL}
            partnerDisplayName={userProfile?.nicknameForPartner || userProfile?.partnerName || 'Partner'}
            colors={colors}
          />
        )}

        {/* Partner Connection Status - Only show if NOT connected */}
        {!hasPartner && (
          <TouchableOpacity
            style={[styles.connectPrompt, { backgroundColor: colors.highlight }]}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Text style={[styles.connectPromptText, { color: colors.tint }]}>
              Connect with your partner! 💕
            </Text>
          </TouchableOpacity>
        )}

        {/* Scattered Icons Area */}
        <View style={styles.iconsArea}>
          {/* Send Love - Left side, lower */}
          <ScatteredIcon
            asset={HubAssets.sendLove}
            filename="send_love.png"
            onPress={handleSendLove}
            style={styles.sendLovePosition}
          />

          {/* Activities - Right side, even lower */}
          <ScatteredIcon
            asset={HubAssets.activities}
            filename="activities.png"
            onPress={handleActivities}
            style={styles.activitiesPosition}
          />
        </View>

        {/* Partner is picking status */}
        {pendingFlowerPicker && !isMyTurnToPick && (
          <View style={[styles.partnerPickingBanner, { backgroundColor: colors.highlight, borderColor: colors.tint }]}>
            <Text style={[styles.partnerPickingText, { color: colors.tint }]}>
              🌱 Partner is choosing a flower...
            </Text>
          </View>
        )}

        {/* Dev Controls (Remove in production) */}
        <DevControls
          onAdd6Hours={handleDevAdd6Hours}
          onAdd24Hours={handleDevAdd24Hours}
          onWater={handleDevWater}
        />
      </View>

      {/* Garden Section - Absolute bottom, above tab bar */}
      <View style={styles.gardenSection}>
        <Garden
          flowers={flowers}
          flowerCount={flowerCount}
          health={health}
          streakProgress={streakProgress}
        />
      </View>

      {/* Level Up Modal */}
      <LevelUpModal
        visible={showLevelUpModal && isMyTurnToPick}
        newLevel={flowerCount}
        userCoins={hearts}
        unlockedFlowers={['rose']}
        onSelectFlower={selectFlowerForSlot}
        onClose={dismissLevelUpModal}
      />
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
  },
  homeTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  daysConnectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  daysText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Main Content Area - leaves room for garden at bottom
  // Garden height = 160 (flowers) + 50 (surface) + 50 (front) = 260px
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 270, // Garden height + small buffer
  },

  // Couple Section
  coupleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  profileContainer: {
    alignItems: 'center',
    flex: 1,
  },
  profileCircle: {
    width: PROFILE_PHOTO_SIZE,
    height: PROFILE_PHOTO_SIZE,
    borderRadius: PROFILE_PHOTO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  profileName: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: PROFILE_PHOTO_SIZE,
  },
  linkIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: PROFILE_PHOTO_SIZE / 2 - 22, // Center vertically with photos
    borderWidth: 2,
  },

  // Connect Prompt
  connectPrompt: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  connectPromptText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Scattered Icons Area
  iconsArea: {
    flex: 1,
    position: 'relative',
  },

  // Scattered Icon Base
  scatteredIcon: {
    position: 'absolute',
    width: HUB_ICON_SIZE,
    height: HUB_ICON_SIZE,
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  iconPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0E8F8',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D8C8E8',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderFilename: {
    fontSize: 9,
    color: '#A090B0',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Scattered Positions (moved down to make room for couple section)
  sendLovePosition: {
    top: 10,
    left: 30,
  },
  activitiesPosition: {
    top: 60,
    right: 40,
  },

  // Partner Picking Banner
  partnerPickingBanner: {
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  partnerPickingText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Garden Section - Fixed at absolute bottom, hugging tab bar
  gardenSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },

  // Dev Controls - Full width, visible
  devContainer: {
    marginTop: 'auto',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFE082',
    borderStyle: 'dashed',
  },
  devTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF8F00',
    textAlign: 'center',
    marginBottom: 10,
  },
  devButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  devButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#FFE082',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonDanger: {
    backgroundColor: '#FFCDD2',
  },
  devButtonSuccess: {
    backgroundColor: '#C8E6C9',
  },
  devButtonWarning: {
    backgroundColor: '#FFE0B2',
  },
  devButtonText: {
    fontSize: 18,
  },
});
