/**
 * Create Screen for LoveWidgets
 * Drawing canvas using react-native-svg
 * (Full implementation coming soon)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PenLine } from 'lucide-react-native';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function CreateScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Create</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Draw something special
        </Text>
      </View>

      {/* Canvas Placeholder */}
      <View style={[styles.canvasContainer, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.canvasPlaceholder}>
          <PenLine size={72} color={colors.tint} strokeWidth={1.5} />
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>
            Drawing Canvas
          </Text>
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            The full drawing experience is coming soon!{'\n'}
            You'll be able to create beautiful drawings{'\n'}
            and notes to send to your loved ones.
          </Text>
        </View>
      </View>

      {/* Tools Preview */}
      <View style={styles.toolsPreview}>
        <Text style={[styles.toolsTitle, { color: colors.text }]}>
          Coming Soon:
        </Text>
        <View style={styles.toolsList}>
          <View style={[styles.toolItem, { backgroundColor: colors.cardBackground }]}>
            <Text style={styles.toolEmoji}>✏️</Text>
            <Text style={[styles.toolText, { color: colors.textSecondary }]}>Draw</Text>
          </View>
          <View style={[styles.toolItem, { backgroundColor: colors.cardBackground }]}>
            <Text style={styles.toolEmoji}>🎨</Text>
            <Text style={[styles.toolText, { color: colors.textSecondary }]}>Colors</Text>
          </View>
          <View style={[styles.toolItem, { backgroundColor: colors.cardBackground }]}>
            <Text style={styles.toolEmoji}>📝</Text>
            <Text style={[styles.toolText, { color: colors.textSecondary }]}>Text</Text>
          </View>
          <View style={[styles.toolItem, { backgroundColor: colors.cardBackground }]}>
            <Text style={styles.toolEmoji}>💖</Text>
            <Text style={[styles.toolText, { color: colors.textSecondary }]}>Stickers</Text>
          </View>
        </View>
      </View>

      {/* Send Button (disabled for now) */}
      <TouchableOpacity
        style={[styles.sendButton, styles.sendButtonDisabled, { backgroundColor: colors.border }]}
        disabled
        activeOpacity={0.8}
      >
        <Text style={[styles.sendButtonTextDisabled, { color: colors.textSecondary }]}>
          Send Widget 💝
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  canvasContainer: {
    flex: 1,
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  canvasPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  toolsPreview: {
    marginBottom: 24,
  },
  toolsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  toolsList: {
    flexDirection: 'row',
    gap: 8,
  },
  toolItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  toolEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  toolText: {
    fontSize: 12,
  },
  sendButton: {
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonTextDisabled: {
    fontSize: 18,
    fontWeight: '600',
  },
});
