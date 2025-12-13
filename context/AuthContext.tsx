/**
 * Authentication Context for LoveWidgets
 * Provides user state and authentication functions using Firebase Auth
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  OAuthProvider,
  GoogleAuthProvider,
  User,
  UserCredential,
} from 'firebase/auth';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth } from '@/config/firebaseConfig';

// ============================================
// TYPES
// ============================================

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<UserCredential | null>;
  signInWithEmail: (email: string, password: string) => Promise<UserCredential>;
  signUpWithEmail: (email: string, password: string) => Promise<UserCredential>;
  signInWithApple: () => Promise<UserCredential>;
  signInWithGoogle: () => Promise<UserCredential>;
  signOut: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Google Sign In
  useEffect(() => {
    // Configure Google Sign In
    // Note: You'll need to add your webClientId from Firebase Console
    // Get it from: Firebase Console > Project Settings > Your Apps > Web App > OAuth 2.0 Client IDs
    GoogleSignin.configure({
      webClientId: '843832822074-r2sqg3pav42a4f3fhcepcr3cj2t6jhfa.apps.googleusercontent.com', // Web Client ID from Firebase
      offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
    });
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Sign in anonymously
  async function signIn(): Promise<UserCredential | null> {
    setIsLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      // User state will be updated by onAuthStateChanged
      return userCredential;
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      setIsLoading(false);
      throw error;
    }
  }

  // Sign up with email and password
  async function signUpWithEmail(email: string, password: string): Promise<UserCredential> {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error) {
      console.error('Error creating account:', error);
      setIsLoading(false);
      throw error;
    }
  }

  // Sign in with email and password
  async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error) {
      console.error('Error signing in with email:', error);
      setIsLoading(false);
      throw error;
    }
  }

  // Sign in with Apple
  async function signInWithApple(): Promise<UserCredential> {
    setIsLoading(true);
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign In is only available on iOS');
      }

      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign In is not available on this device');
      }

      // Request Apple ID credential
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Create Firebase credential from Apple ID token
      const { identityToken, nonce } = appleCredential;
      if (!identityToken) {
        throw new Error('Apple Sign In failed - no identity token');
      }

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: identityToken,
        rawNonce: nonce || undefined,
      });

      // Sign in to Firebase with Apple credential
      const userCredential = await signInWithCredential(auth, credential);
      return userCredential;
    } catch (error: any) {
      console.error('Error signing in with Apple:', error);
      setIsLoading(false);
      
      // Handle user cancellation gracefully
      if (error?.code === 'ERR_CANCELED') {
        throw new Error('Sign in was canceled');
      }
      
      throw error;
    }
  }

  // Sign in with Google
  async function signInWithGoogle(): Promise<UserCredential> {
    setIsLoading(true);
    try {
      // Check if Google Play services are available (Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      
      if (!userInfo.idToken) {
        throw new Error('Google Sign In failed - no ID token');
      }

      // Create Firebase credential from Google ID token
      const googleCredential = GoogleAuthProvider.credential(userInfo.idToken);
      
      // Sign in to Firebase with Google credential
      const userCredential = await signInWithCredential(auth, googleCredential);
      return userCredential;
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      setIsLoading(false);
      
      // Handle user cancellation gracefully
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Sign in was canceled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Sign in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available');
      }
      
      throw error;
    }
  }

  // Sign out
  async function signOut() {
    try {
      // Sign out from Google if signed in with Google
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          await GoogleSignin.signOut();
        }
      } catch (error) {
        // Ignore Google sign out errors
        console.log('Google sign out error (ignored):', error);
      }

      // Sign out from Firebase
      await auth.signOut();
      // User state will be updated by onAuthStateChanged
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signInWithEmail,
    signUpWithEmail,
    signInWithApple,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

