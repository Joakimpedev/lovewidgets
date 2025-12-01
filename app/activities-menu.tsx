/**
 * Activities Menu - Hub for games and activities
 * 
 * Navigates from Home → Here
 * Contains: Tic-Tac-Toe, Questions, Trivia, Whiteboard, etc.
 */

import { useRouter } from 'expo-router';
import { ArrowLeft, Grid3X3, MessageCircle, HelpCircle, PenTool } from 'lucide-react-native';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/context/ThemeContext';

interface ActivityCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  colors: any;
  accentColor: string;
  comingSoon?: boolean;
}

function ActivityCard({ title, description, icon, onPress, colors, accentColor, comingSoon }: ActivityCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.activityCard, 
        { backgroundColor: colors.cardBackground, borderColor: accentColor },
        comingSoon && styles.comingSoonCard
      ]}
      onPress={onPress}
      activeOpacity={comingSoon ? 1 : 0.85}
      disabled={comingSoon}
    >
      <View style={[styles.activityIconContainer, { backgroundColor: `${accentColor}20` }]}>
        {icon}
      </View>
      <View style={styles.activityTextContainer}>
        <View style={styles.titleRow}>
          <Text style={[styles.activityTitle, { color: colors.text }]}>{title}</Text>
          {comingSoon && (
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.streakFire }]}>
              <Text style={styles.comingSoonText}>Soon</Text>
            </View>
          )}
        </View>
        <Text style={[styles.activityDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ActivitiesMenuScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Activities & Games</Text>
        <View style={styles.backButton} />
      </View>

      {/* Activity Cards */}
      <View style={styles.cardGrid}>
        <ActivityCard
          title="Tic-Tac-Toe"
          description="Classic game, infinite fun"
          icon={<Grid3X3 size={32} color="#3498DB" />}
          onPress={() => console.log('Tic-Tac-Toe!')}
          colors={colors}
          accentColor="#3498DB"
          comingSoon
        />

        <ActivityCard
          title="Questions"
          description="Deep conversation starters"
          icon={<MessageCircle size={32} color="#E74C3C" />}
          onPress={() => console.log('Questions!')}
          colors={colors}
          accentColor="#E74C3C"
          comingSoon
        />

        <ActivityCard
          title="Trivia"
          description="How well do you know each other?"
          icon={<HelpCircle size={32} color="#F39C12" />}
          onPress={() => console.log('Trivia!')}
          colors={colors}
          accentColor="#F39C12"
          comingSoon
        />

        <ActivityCard
          title="Whiteboard"
          description="Draw and doodle together"
          icon={<PenTool size={32} color="#9B59B6" />}
          onPress={() => console.log('Whiteboard!')}
          colors={colors}
          accentColor="#9B59B6"
          comingSoon
        />
      </View>
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
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardGrid: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  comingSoonCard: {
    opacity: 0.6,
  },
  activityIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  activityDescription: {
    fontSize: 13,
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
});

