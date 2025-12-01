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
  User,
  UserCredential,
} from 'firebase/auth';
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

  // Sign out
  async function signOut() {
    try {
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

