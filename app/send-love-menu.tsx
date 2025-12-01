/**
 * Send Love Menu - Hub for affection actions
 * 
 * Navigates from Home → Here
 * Contains: Send Affection (navigates to page), Letter, Gift
 */

import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Gift, Heart, PenTool } from 'lucide-react-native';
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

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  colors: any;
  accentColor: string;
}

function ActionCard({ title, description, icon, onPress, colors, accentColor }: ActionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, { backgroundColor: colors.cardBackground, borderColor: accentColor }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.actionIconContainer, { backgroundColor: `${accentColor}20` }]}>
        {icon}
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={[styles.actionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SendLoveMenuScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Send Love</Text>
        <View style={styles.backButton} />
      </View>

      {/* Action Cards */}
      <View style={styles.cardGrid}>
        <ActionCard
          title="Send Affection"
          description="Kiss, hug, wave, and more"
          icon={<Heart size={32} color={colors.secondaryTint} />}
          onPress={() => router.push('/affection-select')}
          colors={colors}
          accentColor={colors.secondaryTint}
        />

        <ActionCard
          title="Update Partner's Widget"
          description="Draw something for their widget"
          icon={<PenTool size={32} color={colors.tint} />}
          onPress={() => router.push('/canvas')}
          colors={colors}
          accentColor={colors.tint}
        />

        <ActionCard
          title="Send a Gift"
          description="Surprise them with something special"
          icon={<Gift size={32} color="#9B59B6" />}
          onPress={() => console.log('Gift shop!')}
          colors={colors}
          accentColor="#9B59B6"
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
  actionCard: {
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
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
  },
});
