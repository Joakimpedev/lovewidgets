/**
 * Visual Theme System for LoveWidgets
 * Controls background images, fence, hub icons, and text colors
 */

import { ImageSourcePropType } from 'react-native';

// ============================================
// THEME IDENTIFIERS
// ============================================

export type VisualThemeId = 'default' | 'space_mode';

// ============================================
// THEME CONFIGURATION INTERFACE
// ============================================

export interface ThemeConfig {
  id: VisualThemeId;
  name: string;
  description: string;
  cost?: number; // Cost in gold (undefined = free/default)
  
  // Assets
  backgroundImage: ImageSourcePropType | null; // Sky background
  fenceImage: ImageSourcePropType | null; // Fence image
  previewImage?: ImageSourcePropType | null; // Preview image for shop (optional)
  hubIcons: {
    left: ImageSourcePropType | null; // Book/journal icon
    middle: ImageSourcePropType | null; // Heart/connection icon
    right: ImageSourcePropType | null; // Shop icon
  };
  
  // Colors (overrides settings theme when active)
  textColor: string; // Primary text color
  textColorSecondary?: string; // Secondary text color
  backgroundColor?: string; // Theme background color
  accentColor?: string; // Theme accent color
  
  // Full color palette (optional - for themes that override the entire color scheme)
  colorPalette?: {
    background: string;        // Main background
    cardBackground: string;     // Card/button backgrounds
    text: string;               // Primary text
    textSecondary: string;      // Secondary text
    tint: string;              // Primary accent (logo, icons)
    secondaryTint: string;     // Secondary accent
    border: string;            // Borders
    highlight: string;        // Highlight backgrounds
    icon: string;             // Icon color
    tabIconDefault: string;   // Tab icon default
    tabIconSelected: string;  // Tab icon selected
  };
}

// ============================================
// THEME DEFINITIONS
// ============================================

/**
 * Default Theme - Pastel look with default options
 */
const defaultTheme: ThemeConfig = {
  id: 'default',
  name: 'Default',
  description: 'Classic pastel garden theme',
  cost: undefined, // Free/default theme
  
  // Assets - using existing fence and default cloud background
  backgroundImage: require('@/assets/garden/sky/background_default.png'), // Default transparent clouds
  fenceImage: require('@/assets/garden/ground/Fence.png'), // Current fence
  previewImage: require('@/assets/icons/theme_preview/default.png'), // Preview image for shop
  hubIcons: {
    left: require('@/assets/icons/hubs/scrapbook.png'), // Scrapbook icon
    middle: require('@/assets/icons/hubs/send_love.png'), // Heart/connection icon
    right: require('@/assets/icons/hubs/gardenshop.png'), // Shop icon
  },
  
  // Colors - pastel theme
  textColor: '#4A5568', // Default text color
  textColorSecondary: '#A0AEC0',
};

/**
 * Space Mode Theme - Dark space theme
 */
const spaceModeTheme: ThemeConfig = {
  id: 'space_mode',
  name: 'Space Mode',
  description: 'Dark space theme with cosmic vibes',
  cost: 50, // Costs 50 gold
  
  // Assets - space themed assets
  backgroundImage: require('@/assets/garden/sky/background_space.png'),
  fenceImage: require('@/assets/garden/ground/Fence_space.png'), // Space-themed fence
  previewImage: require('@/assets/icons/theme_preview/space.png'), // Preview image for shop
  hubIcons: {
    left: require('@/assets/icons/hubs/scrapbook_space.png'),
    middle: require('@/assets/icons/hubs/send_love_space.png'),
    right: require('@/assets/icons/hubs/gardenshop_space.png'),
  },
  
  // Colors - dark theme (matching space background colors)
  textColor: '#58bad3', // Primary text color (cyan)
  textColorSecondary: '#7ac5d9', // Lighter cyan for secondary text
  backgroundColor: '#13152a', // Primary space background color
  accentColor: '#5c537e', // Secondary space accent color
  
  // Full color palette for space theme
  colorPalette: {
    background: '#13152a',        // Main background
    cardBackground: '#1a1d35',     // Slightly lighter for cards (derived from background)
    text: '#58bad3',              // Primary text (cyan)
    textSecondary: '#7ac5d9',     // Secondary text (lighter cyan)
    tint: '#58bad3',              // Primary accent (cyan - for logos, icons)
    secondaryTint: '#4a9bb8',    // Secondary accent (darker cyan)
    border: '#2a2d4a',            // Borders (dark blue-gray)
    highlight: '#1f2340',         // Highlight backgrounds (slightly lighter than background)
    icon: '#58bad3',              // Icon color (cyan)
    tabIconDefault: '#4a9bb8',    // Tab icon default (darker cyan)
    tabIconSelected: '#58bad3',   // Tab icon selected (cyan)
  },
};

// ============================================
// THEME REGISTRY
// ============================================

export const THEME_CONFIGS: Record<VisualThemeId, ThemeConfig> = {
  default: defaultTheme,
  space_mode: spaceModeTheme,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get theme configuration by ID
 */
export function getThemeConfig(themeId: VisualThemeId): ThemeConfig {
  return THEME_CONFIGS[themeId] || THEME_CONFIGS.default;
}

/**
 * Get all available themes
 */
export function getAllThemes(): ThemeConfig[] {
  return Object.values(THEME_CONFIGS);
}

/**
 * Check if a theme exists
 */
export function isValidThemeId(themeId: string): themeId is VisualThemeId {
  return themeId in THEME_CONFIGS;
}

