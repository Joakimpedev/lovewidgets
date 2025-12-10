/**
 * Root Layout for LoveWidgets
 * Handles navigation structure and authentication flow
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { initRevenueCat, logOutRevenueCat, setRevenueCatUserId } from '@/config/revenueCatConfig';
import { Colors } from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ColorThemeProvider, useTheme } from '@/context/ThemeContext';

// Keep splash screen visible while we check auth state
SplashScreen.preventAutoHideAsync();

// Theme generator function
function createNavigationTheme(colors: ReturnType<typeof Colors>, isDark: boolean) {
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.light.tint,
      background: colors.light.background,
      card: colors.light.cardBackground,
      text: colors.light.text,
      border: colors.light.border,
    },
  };
}

// ============================================
// NAVIGATION LOGIC (THE BOUNCER)
// ============================================

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading } = useAuth();
  const { colors: themeColors, colorScheme } = useTheme();
  
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Initialize RevenueCat when app starts
  useEffect(() => {
    initRevenueCat().catch((error) => {
      console.error('[RootLayout] Failed to initialize RevenueCat:', error);
    });
  }, []);

  // Set RevenueCat user ID when user logs in/out
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        setRevenueCatUserId(user.uid).catch((error) => {
          console.error('[RootLayout] Failed to set RevenueCat user ID:', error);
        });
      } else {
        logOutRevenueCat().catch((error) => {
          console.error('[RootLayout] Failed to log out RevenueCat:', error);
        });
      }
    }
  }, [user, isLoading]);

  // Hide splash screen once auth state is determined
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
      setIsNavigationReady(true);
    }
  }, [isLoading]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isNavigationReady) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (!user && !inOnboarding) {
      // User is not logged in, redirect to onboarding
      router.replace('/onboarding');
    } else if (user && inOnboarding) {
      // User is logged in but on onboarding screen, redirect to main app
      router.replace('/(tabs)');
    }
  }, [isNavigationReady, user, segments]);

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5998DE" />
      </View>
    );
  }

  // Use theme-aware colorScheme instead of system colorScheme
  const theme = createNavigationTheme(themeColors, colorScheme === 'dark');

  return (
    <ThemeProvider value={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="onboarding" 
          options={{ 
            headerShown: false,
            animation: 'fade',
          }} 
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal', 
            title: 'Modal',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="canvas" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// ============================================
// ROOT LAYOUT (WRAPPED IN AUTH PROVIDER)
// ============================================

export default function RootLayout() {
  return (
    <AuthProvider>
      <ColorThemeProvider>
        <RootLayoutNav />
      </ColorThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDF5FC',
  },
});
