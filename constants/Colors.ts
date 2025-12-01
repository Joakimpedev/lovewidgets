/**
 * Color Theme System
 * Multiple pastel themes with matching saturation/darkness levels
 * Based on background: #EDF5FC (light blue) and tab: #5998DE (darker blue)
 */

// ============================================
// THEME DEFINITIONS
// ============================================

type ThemeId = 'blue' | 'pink' | 'yellow' | 'purple' | 'green';

interface ThemeColors {
  background: string;        // Main background (#EDF5FC level)
  tint: string;              // Primary accent (tab color level - #5998DE)
  secondaryTint: string;    // Secondary accent (pink level)
  tabIcon: string;          // Tab icon color (darker version of tint)
  border: string;            // Border color (very light version)
  highlight: string;         // Highlight background
}

const THEMES: Record<ThemeId, ThemeColors> = {
  blue: {
    background: '#EDF5FC',      // Current light blue
    tint: '#5998DE',            // Current tab blue
    secondaryTint: '#FFB8C6',   // Soft pink
    tabIcon: '#5998DE',
    border: '#E8F4FD',
    highlight: '#E6F3FF',
  },
  pink: {
    background: '#FCE8F5',       // Light pink (same lightness as blue)
    tint: '#E87BA4',            // Darker pink (same darkness as blue tab)
    secondaryTint: '#FFB8C6',   // Soft pink
    tabIcon: '#E87BA4',
    border: '#F8E8F0',
    highlight: '#FFE6F3',
  },
  yellow: {
    background: '#FCF8E8',       // Light yellow
    tint: '#D4A853',            // Darker yellow/gold
    secondaryTint: '#FFD89C',   // Soft orange
    tabIcon: '#D4A853',
    border: '#F8F4E8',
    highlight: '#FFF8E6',
  },
  purple: {
    background: '#F5E8FC',       // Light purple
    tint: '#A78BDE',            // Darker purple
    secondaryTint: '#D4B8FF',   // Soft purple
    tabIcon: '#A78BDE',
    border: '#F0E8FD',
    highlight: '#F3E6FF',
  },
  green: {
    background: '#E8FCE8',       // Light green
    tint: '#7BC87B',            // Darker green
    secondaryTint: '#B8E6B8',   // Soft green
    tabIcon: '#7BC87B',
    border: '#E8F8E8',
    highlight: '#E6FFE6',
  },
};

// ============================================
// BASE COLORS (Theme-independent)
// ============================================

const baseColors = {
  text: '#4A5568',
  textSecondary: '#A0AEC0',
  cardBackground: '#FFFFFF',
  icon: '#718096',
  success: '#9AE6B4',
  streakFire: '#FBD38D',
  error: '#FEB2B2',
  warning: '#FAF089',
};

// ============================================
// COLOR GENERATOR
// ============================================

function generateTheme(themeId: ThemeId = 'blue') {
  const theme = THEMES[themeId];
  
  return {
    light: {
      // Core Colors
      text: baseColors.text,
      textSecondary: baseColors.textSecondary,
      background: theme.background,
      cardBackground: baseColors.cardBackground,
      
      // Accent Colors (from theme)
      tint: theme.tint,
      secondaryTint: theme.secondaryTint,
      
      // UI Elements
      icon: baseColors.icon,
      tabIconDefault: theme.tabIcon,
      tabIconSelected: theme.tabIcon,
      border: theme.border,
      
      // Status Colors
      success: baseColors.success,
      streakFire: baseColors.streakFire,
      error: baseColors.error,
      warning: baseColors.warning,
      
      // Special
      highlight: theme.highlight,
    },
    dark: {
      // Dark theme (simplified for now, can be expanded)
      text: '#E2E8F0',
      textSecondary: '#A0AEC0',
      background: '#1A202C',
      cardBackground: '#2D3748',
      tint: theme.tint,
      secondaryTint: theme.secondaryTint,
      icon: '#A0AEC0',
      tabIconDefault: '#4A5568',
      tabIconSelected: theme.tint,
      border: '#4A5568',
      success: '#68D391',
      streakFire: '#F6AD55',
      error: '#FC8181',
      warning: '#ECC94B',
      highlight: '#2A4365',
    },
  };
}

// Default export (Blue theme)
export const Colors = generateTheme('blue');

// Export theme generator and types
export { generateTheme, THEMES };
export type { ThemeId };

