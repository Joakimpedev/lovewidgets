/**
 * Scrapbook Screen
 * Displays a grid of preserved garden memories as Polaroid-style cards
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookOpen } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/Colors';
import { subscribeToUserProfile, UserProfile, ScrapbookMemory } from '@/utils/pairing';
import { getScrapbookMemories } from '@/utils/scrapbook';
import { GardenSnapshot } from '@/components/GardenSnapshot';
import { preserveMemory } from '@/utils/scrapbook';
import { useGardenStatus } from '@/hooks/useGardenStatus';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // Single column with padding
const CARD_GAP = 16;
// Calculate scale to fit garden width in card content area
// Card has padding: 12px each side = 24px total inside the card
// Card width = SCREEN_WIDTH - 32 (outer padding from screen edges)
// Card content width = SCREEN_WIDTH - 32 - 24 = SCREEN_WIDTH - 56
// Garden width = SCREEN_WIDTH
// Scale = content width / garden width
const CARD_OUTER_PADDING = 32; // 16px each side from screen
const CARD_INNER_PADDING = 24; // 12px each side inside card
const CARD_CONTENT_WIDTH = SCREEN_WIDTH - CARD_OUTER_PADDING - CARD_INNER_PADDING;
const MINI_SCALE = CARD_CONTENT_WIDTH / SCREEN_WIDTH;

const TOTAL_GARDEN_HEIGHT = 196 + 62 + 62; // FLOWER_AREA_HEIGHT + GROUND_SURFACE_HEIGHT + GROUND_FRONT_HEIGHT

export default function ScrapbookScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const { colors: themeColors, visualThemeId } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];
  const { flowers, landmarks } = useGardenStatus();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [memories, setMemories] = useState<ScrapbookMemory[]>([]);
  const [showPreserveModal, setShowPreserveModal] = useState(false);
  const [memoryTitle, setMemoryTitle] = useState('');
  const [isPreserving, setIsPreserving] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<ScrapbookMemory | null>(null);

  // Subscribe to user profile
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserProfile(user.uid, (profile) => {
      setUserProfile(profile);
      if (profile?.scrapbook) {
        // Sort by date (newest first)
        const sorted = [...profile.scrapbook].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setMemories(sorted);
      } else {
        setMemories([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handlePreserveGarden = async () => {
    if (!user || !userProfile?.partnerId) {
      Alert.alert('Error', 'You need to be connected to a partner to preserve your garden.');
      return;
    }

    if (!memoryTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for this memory.');
      return;
    }

    if (flowers.length === 0 && landmarks.length === 0) {
      Alert.alert('Error', 'Your garden is empty. Plant some flowers or landmarks first!');
      return;
    }

    setIsPreserving(true);
    try {
      const result = await preserveMemory(
        user.uid,
        userProfile.partnerId,
        memoryTitle.trim(),
        visualThemeId
      );

      if (result.success) {
        Alert.alert('Success', 'Your garden has been preserved!', [
          {
            text: 'OK',
            onPress: () => {
              setShowPreserveModal(false);
              setMemoryTitle('');
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to preserve garden.');
      }
    } catch (error) {
      console.error('[Scrapbook] Error preserving garden:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setIsPreserving(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <BookOpen size={24} color={colors.tint} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Scrapbook</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowPreserveModal(true)}
          style={[styles.preserveButton, { backgroundColor: colors.tint }]}
        >
          <Text style={[styles.preserveButtonText, { color: '#FFFFFF' }]}>Preserve</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {memories.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={64} color={colors.tabIconDefault} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Memories Yet</Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              Preserve your garden to create your first memory!
            </Text>
            <TouchableOpacity
              onPress={() => setShowPreserveModal(true)}
              style={[styles.emptyStateButton, { backgroundColor: colors.tint }]}
            >
              <Text style={[styles.emptyStateButtonText, { color: '#FFFFFF' }]}>
                Preserve Garden
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {memories.map((memory) => (
              <TouchableOpacity
                key={memory.id}
                style={[styles.polaroidCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => setSelectedMemory(memory)}
                activeOpacity={0.8}
              >
                {/* Mini Garden - Square container with bottom-aligned crop */}
                <View style={styles.gardenContainer}>
                  <GardenSnapshot
                    flowers={memory.gardenSnapshot}
                    landmarks={memory.landmarkSnapshot}
                    themeId={memory.themeId as any}
                    scale={MINI_SCALE}
                    cropMode={true}
                  />
                </View>

                {/* Title and Date */}
                <View style={styles.cardFooter}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                    {memory.title}
                  </Text>
                  <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                    {formatDate(memory.date)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Preserve Garden Modal */}
      <Modal
        visible={showPreserveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPreserveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Preserve Garden</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Name this memory
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., Our First Month"
              placeholderTextColor={colors.textSecondary}
              value={memoryTitle}
              onChangeText={setMemoryTitle}
              maxLength={50}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setShowPreserveModal(false);
                  setMemoryTitle('');
                }}
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePreserveGarden}
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: colors.tint }]}
                disabled={isPreserving}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  {isPreserving ? 'Preserving...' : 'Preserve'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Size Memory Modal */}
      <Modal
        visible={selectedMemory !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMemory(null)}
      >
        <View style={styles.fullSizeModalOverlay}>
          <View style={[styles.fullSizeModalContent, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.fullSizeModalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.fullSizeModalHeaderText}>
                <Text style={[styles.fullSizeModalTitle, { color: colors.text }]}>
                  {selectedMemory?.title}
                </Text>
                <Text style={[styles.fullSizeModalDate, { color: colors.textSecondary }]}>
                  {selectedMemory ? formatDate(selectedMemory.date) : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedMemory(null)}
                style={styles.fullSizeModalCloseButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.fullSizeModalCloseText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Full Size Garden */}
            {selectedMemory && (
              <View style={styles.fullSizeGardenContainer}>
                <GardenSnapshot
                  flowers={selectedMemory.gardenSnapshot}
                  landmarks={selectedMemory.landmarkSnapshot}
                  themeId={selectedMemory.themeId as any}
                  scale={1.0}
                  cropMode={false}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  preserveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  preserveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    gap: CARD_GAP,
  },
  polaroidCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    padding: 12,
    marginBottom: CARD_GAP,
    // Polaroid effect: white background, shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gardenContainer: {
    width: '100%',
    aspectRatio: 1, // Perfect square (1:1 aspect ratio)
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden', // Crop the top portion
    alignItems: 'center',
    justifyContent: 'flex-end', // Align garden to bottom
  },
  cardFooter: {
    paddingTop: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    // Handwritten font style (you can add a custom font later)
    fontStyle: 'italic',
  },
  cardDate: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
  },
  modalButtonConfirm: {
    // backgroundColor set inline
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fullSizeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullSizeModalContent: {
    width: '100%',
    maxWidth: SCREEN_WIDTH,
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  fullSizeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  fullSizeModalHeaderText: {
    flex: 1,
  },
  fullSizeModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  fullSizeModalDate: {
    fontSize: 14,
  },
  fullSizeModalCloseButton: {
    padding: 8,
    marginLeft: 16,
  },
  fullSizeModalCloseText: {
    fontSize: 24,
    fontWeight: '300',
  },
  fullSizeGardenContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});

