/**
 * Theme Context
 * Manages color theme and visual theme selection and persistence
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { generateTheme, ThemeId } from '@/constants/Colors';
import { VisualThemeId, getThemeConfig, ThemeConfig } from '@/constants/ThemeConfig';

interface ThemeContextType {
  // Color theme (from settings)
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => Promise<void>;
  colors: ReturnType<typeof generateTheme>;
  
  // Visual theme (garden theme)
  visualThemeId: VisualThemeId;
  setVisualTheme: (themeId: VisualThemeId) => Promise<void>;
  visualTheme: ThemeConfig;
  
  // Color scheme (forced to light when default theme is active)
  colorScheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@LoveWidgets:theme';
const VISUAL_THEME_STORAGE_KEY = '@LoveWidgets:visualTheme';

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>('blue');
  const [baseColors, setBaseColors] = useState(generateTheme('blue'));
  const [visualThemeId, setVisualThemeId] = useState<VisualThemeId>('default');
  const [visualTheme, setVisualThemeState] = useState<ThemeConfig>(getThemeConfig('default'));
  const systemColorScheme = useColorScheme();

  // Apply visual theme colors to base colors if visual theme is active
  // This makes visual theme colors work globally everywhere
  const colors = React.useMemo(() => {
    const isVisualThemeActive = visualTheme.id !== 'default';
    
    if (isVisualThemeActive && visualTheme.colorPalette) {
      // Visual theme colors take complete priority
      return {
        light: {
          ...baseColors.light,
          ...visualTheme.colorPalette,
        },
        dark: {
          ...baseColors.dark,
          ...visualTheme.colorPalette,
        },
      };
    }
    
    return baseColors;
  }, [baseColors, visualTheme]);

  // Color scheme: force light mode when default theme is active
  // Default theme is not compatible with dark mode
  const colorScheme = React.useMemo(() => {
    if (visualTheme.id === 'default') {
      return 'light' as const;
    }
    // For other themes (like space_mode), allow system preference or default to light
    return (systemColorScheme ?? 'light') as 'light' | 'dark';
  }, [visualTheme.id, systemColorScheme]);

  // Load color theme from storage on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ['blue', 'pink', 'yellow', 'purple', 'green'].includes(savedTheme)) {
          const theme = savedTheme as ThemeId;
          setThemeId(theme);
          setBaseColors(generateTheme(theme));
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    }
    loadTheme();
  }, []);

  // Load visual theme from storage on mount
  useEffect(() => {
    async function loadVisualTheme() {
      try {
        const savedVisualTheme = await AsyncStorage.getItem(VISUAL_THEME_STORAGE_KEY);
        if (savedVisualTheme && (savedVisualTheme === 'default' || savedVisualTheme === 'space_mode')) {
          const theme = savedVisualTheme as VisualThemeId;
          setVisualThemeId(theme);
          setVisualThemeState(getThemeConfig(theme));
        }
      } catch (error) {
        console.error('Error loading visual theme:', error);
      }
    }
    loadVisualTheme();
  }, []);

  // Update color theme
  async function setTheme(newThemeId: ThemeId) {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newThemeId);
      setThemeId(newThemeId);
      setBaseColors(generateTheme(newThemeId));
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }

  // Update visual theme
  async function setVisualTheme(newVisualThemeId: VisualThemeId) {
    try {
      await AsyncStorage.setItem(VISUAL_THEME_STORAGE_KEY, newVisualThemeId);
      setVisualThemeId(newVisualThemeId);
      setVisualThemeState(getThemeConfig(newVisualThemeId));
    } catch (error) {
      console.error('Error saving visual theme:', error);
    }
  }

  return (
    <ThemeContext.Provider value={{ 
      themeId, 
      setTheme, 
      colors,
      visualThemeId,
      setVisualTheme,
      visualTheme,
      colorScheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Alias for convenience
export { ColorThemeProvider as ThemeProvider };

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

