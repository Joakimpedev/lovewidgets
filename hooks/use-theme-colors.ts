/**
 * Hook to get current theme colors
 * Combines color scheme (light/dark) with selected theme
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/context/ThemeContext';

export function useThemeColors() {
  const colorScheme = useColorScheme();
  const { colors } = useTheme();
  return colors[colorScheme ?? 'light'];
}

