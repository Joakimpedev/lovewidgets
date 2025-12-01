/**
 * Tab Layout for LoveWidgets
 * Main navigation tabs: Home, Letters, Settings
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Mail, User } from 'lucide-react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];
  
  // Get actual safe area insets (works on both iOS and Android)
  const { bottom } = useSafeAreaInsets();
  
  // Calculate tab bar dimensions with safe area
  const BASE_PADDING_TOP = 10;
  const BASE_PADDING_BOTTOM = 12;
  const BASE_HEIGHT = 60;
  
  // Add safe area bottom inset to padding and height
  const tabBarPaddingBottom = BASE_PADDING_BOTTOM + bottom;
  const tabBarHeight = BASE_HEIGHT + bottom + BASE_PADDING_TOP;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: BASE_PADDING_TOP,
          paddingBottom: tabBarPaddingBottom,
          height: tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size ?? 24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="letters"
        options={{
          title: 'Letters',
          tabBarIcon: ({ color, size }) => <Mail size={size ?? 24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size ?? 24} color={color} />,
        }}
      />
      {/* Hide old tabs */}
      <Tabs.Screen
        name="create"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
