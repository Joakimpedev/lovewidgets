/**
 * Letters Screen for LoveWidgets
 * Displays sent and received letters from Firestore
 * Stacked timeline with alternating alignment
 */

import { useRouter } from 'expo-router';
import { Heart, Package, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Letter, subscribeToLetters, formatLetterDate } from '@/utils/letters';
import { subscribeToUserProfile, UserProfile } from '@/utils/pairing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2) * 0.55; // 55% width for vertical cards

// ============================================
// COMPONENTS
// ============================================

interface LetterCardProps {
  letter: Letter;
  isOutgoing: boolean;
  colors: any; // Theme colors
  senderName?: string; // Name of the sender (for received letters)
  onPress: () => void;
}

function LetterCard({ letter, isOutgoing, colors, senderName, onPress }: LetterCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Affection type messages with emojis
  const affectionMessages: Record<string, { text: string; emoji: string }> = {
    kiss: { text: 'sent you a kiss', emoji: '😘' },
    hug: { text: 'sent you a hug', emoji: '🤗' },
    wave: { text: 'waved at you', emoji: '👋' },
    celebration: { text: 'celebrated with you', emoji: '🎉' },
    tickle: { text: 'tickled you', emoji: '😄' },
    noseboop: { text: 'gave you a nose boop', emoji: '👆' },
    cuddle: { text: 'cuddled with you', emoji: '🥰' },
    pat: { text: 'gave you a pat on the back', emoji: '👏' },
  };

  // Received = LEFT, Sent by me = RIGHT
  return (
    <View style={[
      styles.cardWrapper,
      isOutgoing ? styles.cardWrapperRight : styles.cardWrapperLeft,
    ]}>
      {letter.type === 'affection' ? (
        // Affection message card
        <View style={[styles.affectionCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.affectionText, { color: colors.text }]}>
            {(() => {
              const msg = affectionMessages[letter.affectionType || ''] || { text: 'sent affection', emoji: '💕' };
              return isOutgoing 
                ? `You ${msg.text} ${msg.emoji}`
                : `${senderName || 'They'} ${msg.text} ${msg.emoji}`;
            })()}
          </Text>
          <Text style={[styles.affectionDate, { color: colors.textSecondary }]}>
            {formatLetterDate(letter.timestamp)}
          </Text>
          {!letter.isRead && !isOutgoing && (
            <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />
          )}
        </View>
      ) : (
        // Widget update card
        <TouchableOpacity
          style={[styles.letterCard, { backgroundColor: colors.cardBackground }]}
          onPress={onPress}
          activeOpacity={0.85}
        >
          {/* Widget Preview */}
          <View style={[styles.previewArea, { backgroundColor: colors.background }]}>
            {letter.imageUrl ? (
              <>
                {!imageLoaded && (
                  <ActivityIndicator 
                    size="small" 
                    color={colors.tint} 
                    style={styles.imageLoader}
                  />
                )}
                <Image
                  source={{ uri: letter.imageUrl }}
                  style={styles.previewImage}
                  resizeMode="contain"
                  onLoad={() => setImageLoaded(true)}
                />
              </>
            ) : (
              <View style={styles.placeholderArea}>
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                  Widget Update
                </Text>
              </View>
            )}
          </View>
          
          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
              {isOutgoing 
                ? `You updated their widget`
                : `${senderName || 'They'} updated your widget`
              }
            </Text>
            {!letter.isRead && !isOutgoing && (
              <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />
            )}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptyState({ colors, hasPartner }: { colors: any; hasPartner: boolean }) {
  const router = useRouter();
  
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.border }]}>
        <Package size={48} color={colors.textSecondary} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {hasPartner ? 'No letters yet' : 'No partner connected'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {hasPartner 
          ? 'Why not send the first one?' 
          : 'Connect with your partner to start sharing letters'}
      </Text>
      
      {hasPartner ? (
        <Heart 
          size={20} 
          color={colors.tint} 
          fill={colors.tint}
          style={styles.emptyHeart}
        />
      ) : (
        <TouchableOpacity
          style={[styles.connectButton, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Text style={styles.connectButtonText}>Go to Profile</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function LoadingState({ colors }: { colors: any }) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={colors.tint} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Loading letters...
      </Text>
    </View>
  );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function LettersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Subscribe to user profile for partner info
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserProfile(user.uid, (profile) => {
      setUserProfile(profile);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to letters once we have partner info
  useEffect(() => {
    if (!user || !userProfile) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToLetters(
      user.uid,
      userProfile.partnerId,
      (fetchedLetters) => {
        setLetters(fetchedLetters);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, userProfile?.partnerId]);

  // Auto-scroll to bottom when letters change (newest at bottom)
  useEffect(() => {
    if (letters.length > 0 && !isLoading) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [letters.length, isLoading]);

  const hasPartner = !!userProfile?.partnerId;
  const unreadCount = letters.filter(l => !l.isRead && l.receiverId === user?.uid).length;

  async function onRefresh() {
    setRefreshing(true);
    // Letters update via real-time listener, just simulate refresh
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }

  function handleLetterPress(letter: Letter) {
    // TODO: Open letter detail view
    console.log('Letter pressed:', letter.id);
  }

  function handleCompose() {
    router.push('/canvas');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Letters</Text>
          {unreadCount > 0 && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {unreadCount} new 💌
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.composeButton, 
            { backgroundColor: hasPartner ? colors.tint : colors.border }
          ]}
          onPress={handleCompose}
          activeOpacity={0.85}
          disabled={!hasPartner}
        >
          <Sparkles size={20} color={hasPartner ? '#FFFFFF' : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <LoadingState colors={colors} />
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
        >
          {letters.length > 0 ? (
            <View style={styles.timeline}>
              {letters.map((letter) => {
                const isOutgoing = letter.senderId === user?.uid;
                const senderName = isOutgoing 
                  ? undefined 
                  : (userProfile?.nicknameFromPartner || userProfile?.partnerName || 'They');
                
                return (
                  <LetterCard
                    key={letter.id}
                    letter={letter}
                    isOutgoing={isOutgoing}
                    senderName={senderName}
                    colors={colors}
                    onPress={() => handleLetterPress(letter)}
                  />
                );
              })}
            </View>
          ) : (
            <EmptyState colors={colors} hasPartner={hasPartner} />
          )}
        </ScrollView>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  composeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS shadow for premium feel
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B81',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        // No elevation - solid tint color is enough
      },
    }),
  },

  // Scroll & Timeline
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 32,
    flexGrow: 1,
  },
  timeline: {
    gap: 16,
  },

  // Card Wrapper - controls alignment
  cardWrapper: {
    width: '100%',
  },
  cardWrapperLeft: {
    alignItems: 'flex-start', // Incoming (received) - align left
  },
  cardWrapperRight: {
    alignItems: 'flex-end', // Outgoing (sent by me) - align right
  },

  // Letter Card - square for widget
  letterCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH, // Square for widget
    borderRadius: 16,
    overflow: 'hidden',
    // Platform-specific card styling
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        // Clean border for Android instead of buggy elevation
        borderWidth: 1,
        borderColor: '#E8F4FD', // Will be overridden by theme
      },
    }),
  },
  previewArea: {
    flex: 1,
    margin: 8,
    marginBottom: 0,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  imageLoader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -10,
    marginLeft: -10,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Affection Card
  affectionCard: {
    padding: 16,
    borderRadius: 16,
    maxWidth: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  affectionText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
  },
  affectionDate: {
    fontSize: 12,
    fontWeight: '400',
  },
  placeholderArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Loading State
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  emptyHeart: {
    marginTop: 16,
  },
  connectButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
