/**
 * Theme Context
 * Manages color theme selection and persistence
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateTheme, ThemeId } from '@/constants/Colors';

interface ThemeContextType {
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => Promise<void>;
  colors: ReturnType<typeof generateTheme>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@LoveWidgets:theme';

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>('blue');
  const [colors, setColors] = useState(generateTheme('blue'));

  // Load theme from storage on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ['blue', 'pink', 'yellow', 'purple', 'green'].includes(savedTheme)) {
          const theme = savedTheme as ThemeId;
          setThemeId(theme);
          setColors(generateTheme(theme));
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    }
    loadTheme();
  }, []);

  // Update theme
  async function setTheme(newThemeId: ThemeId) {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newThemeId);
      setThemeId(newThemeId);
      setColors(generateTheme(newThemeId));
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }

  return (
    <ThemeContext.Provider value={{ themeId, setTheme, colors }}>
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

