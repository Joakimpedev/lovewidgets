/**
 * Onboarding Flow for LoveWidgets
 * 5-step sequential screens: Welcome → Intent → Profile → Notifications → Sign-In
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Heart,
  Send,
  MessageCircle,
  Sparkles,
  Bell,
  Infinity,
  Check,
  Gift,
  BookHeart,
  Smile,
  Mail,
  User,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { saveUserProfile, UserRole } from '@/utils/storage';
import { useAuth } from '@/context/AuthContext';
import { createUserProfile } from '@/utils/pairing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES & DATA
// ============================================

type OnboardingStep = 'welcome' | 'intent' | 'profile' | 'notifications' | 'signin';

const INTENTS = [
  { id: 'notes', label: 'Send cute notes & doodles', icon: Send, emoji: '✏️' },
  { id: 'conversations', label: 'Start meaningful conversations', icon: MessageCircle, emoji: '💬' },
  { id: 'surprises', label: 'Surprise my partner', icon: Gift, emoji: '🎁' },
  { id: 'memories', label: 'Build a memory book together', icon: BookHeart, emoji: '📖' },
  { id: 'daily', label: 'Daily check-ins & reminders', icon: Bell, emoji: '☀️' },
  { id: 'fun', label: 'Just have fun together', icon: Smile, emoji: '😊' },
];

const ROLES: { id: UserRole; label: string; emoji: string; description: string }[] = [
  { id: 'Partner', label: 'Partner', emoji: '💕', description: 'Romantic relationship' },
  { id: 'Bestie', label: 'Bestie', emoji: '✨', description: 'Best friends' },
  { id: 'Family', label: 'Family', emoji: '🏠', description: 'Family connection' },
];

// ============================================
// STEP COMPONENTS
// ============================================

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.stepContainer}>
      {/* Elegant Illustration */}
      <View style={styles.illustrationContainer}>
        <View style={styles.infinityCircle}>
          <Infinity size={72} color={Colors.light.tint} strokeWidth={1.5} />
        </View>
        <View style={styles.floatingHearts}>
          <Heart
            size={22}
            color={Colors.light.secondaryTint}
            fill={Colors.light.secondaryTint}
            style={styles.floatingHeart1}
          />
          <Heart
            size={16}
            color={Colors.light.tint}
            fill={Colors.light.tint}
            style={styles.floatingHeart2}
          />
          <Sparkles
            size={18}
            color={Colors.light.streakFire}
            style={styles.floatingSpark}
          />
        </View>
      </View>

      {/* Welcome Text */}
      <View style={styles.textContainer}>
        <Text style={styles.welcomeTitle}>Welcome to LoveWidgets</Text>
        <Text style={styles.welcomeSubtitle}>
          A beautiful way to stay connected with the people you love, right on their home screen.
        </Text>
      </View>

      {/* Continue Button */}
      <TouchableOpacity style={styles.primaryButton} onPress={onNext} activeOpacity={0.85}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

function IntentStep({
  selectedIntents,
  onToggleIntent,
  onNext,
}: {
  selectedIntents: string[];
  onToggleIntent: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What brings you here?</Text>
      <Text style={styles.stepSubtitle}>Select all that excite you</Text>

      <ScrollView style={styles.intentsList} showsVerticalScrollIndicator={false}>
        {INTENTS.map((intent) => {
          const isSelected = selectedIntents.includes(intent.id);
          const IconComponent = intent.icon;
          return (
            <Pressable
              key={intent.id}
              style={[styles.intentItem, isSelected && styles.intentItemSelected]}
              onPress={() => onToggleIntent(intent.id)}
            >
              <View style={[styles.intentIcon, isSelected && styles.intentIconSelected]}>
                <IconComponent size={22} color={isSelected ? Colors.light.tint : Colors.light.textSecondary} />
              </View>
              <Text style={[styles.intentLabel, isSelected && styles.intentLabelSelected]}>
                {intent.label}
              </Text>
              {isSelected && (
                <View style={styles.checkCircle}>
                  <Check size={14} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.primaryButton} onPress={onNext} activeOpacity={0.85}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

function ProfileStep({
  name,
  setName,
  selectedRole,
  setSelectedRole,
  onNext,
}: {
  name: string;
  setName: (name: string) => void;
  selectedRole: UserRole | null;
  setSelectedRole: (role: UserRole) => void;
  onNext: () => void;
}) {
  const canContinue = name.trim().length >= 2 && selectedRole !== null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>Tell us about you</Text>
      <Text style={styles.stepSubtitle}>So your partner knows it's you</Text>

      <View style={styles.profileForm}>
        {/* Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Your name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your name"
            placeholderTextColor={Colors.light.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={30}
          />
        </View>

        {/* Role Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>You are their...</Text>
          <View style={styles.roleGrid}>
            {ROLES.map((role) => (
              <Pressable
                key={role.id}
                style={[styles.roleCard, selectedRole === role.id && styles.roleCardSelected]}
                onPress={() => setSelectedRole(role.id)}
              >
                <Text style={styles.roleEmoji}>{role.emoji}</Text>
                <Text style={[styles.roleLabel, selectedRole === role.id && styles.roleLabelSelected]}>
                  {role.label}
                </Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
        onPress={onNext}
        activeOpacity={0.85}
        disabled={!canContinue}
      >
        <Text style={[styles.primaryButtonText, !canContinue && styles.primaryButtonTextDisabled]}>
          Continue
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

function NotificationsStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.stepContainer}>
      {/* Bell Illustration */}
      <View style={styles.notificationIllustration}>
        <View style={styles.bellCircle}>
          <Bell size={56} color={Colors.light.tint} />
        </View>
        <View style={styles.notificationDot} />
      </View>

      <Text style={styles.stepTitle}>Stay Connected</Text>
      <Text style={styles.notificationDescription}>
        Get notified when your partner sends you a note, so you never miss a moment of love.
      </Text>

      <View style={styles.notificationFeatures}>
        <View style={styles.notificationFeature}>
          <Check size={18} color={Colors.light.success} />
          <Text style={styles.notificationFeatureText}>New letter alerts</Text>
        </View>
        <View style={styles.notificationFeature}>
          <Check size={18} color={Colors.light.success} />
          <Text style={styles.notificationFeatureText}>Daily reminders</Text>
        </View>
        <View style={styles.notificationFeature}>
          <Check size={18} color={Colors.light.success} />
          <Text style={styles.notificationFeatureText}>Gentle nudges</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={onNext} activeOpacity={0.85}>
        <Text style={styles.primaryButtonText}>Enable Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={onNext}>
        <Text style={styles.skipButtonText}>Maybe later</Text>
      </TouchableOpacity>
    </View>
  );
}

function SignInStep({
  isLoading,
  error,
  onSignUp,
  onSignIn,
  onSignInAnonymous,
}: {
  isLoading: boolean;
  error: string;
  onSignUp: (email: string, password: string) => void;
  onSignIn: (email: string, password: string) => void;
  onSignInAnonymous: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignInMode, setIsSignInMode] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length >= 6;

  function handleSubmit() {
    if (!canSubmit) return;
    if (isSignInMode) {
      onSignIn(email.trim(), password);
    } else {
      onSignUp(email.trim(), password);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.stepContainer}
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.signinHeader}>
          <View style={styles.signinIconCircle}>
            <Mail size={32} color={Colors.light.tint} />
          </View>
          <Text style={styles.stepTitle}>
            {isSignInMode ? 'Welcome Back' : 'Create Your Account'}
          </Text>
          <Text style={styles.signinDescription}>
            {isSignInMode
              ? 'Sign in to access your account and continue your journey.'
              : 'Create an account to sync your data across devices.'}
          </Text>
        </View>

        {/* Email/Password Form */}
        <View style={styles.authForm}>
          <View style={styles.authInputGroup}>
            <Text style={styles.authInputLabel}>Email</Text>
            <TextInput
              style={styles.authInput}
              placeholder="your@email.com"
              placeholderTextColor={Colors.light.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.authInputGroup}>
            <Text style={styles.authInputLabel}>Password</Text>
            <TextInput
              style={styles.authInput}
              placeholder={isSignInMode ? 'Enter your password' : 'Min 6 characters'}
              placeholderTextColor={Colors.light.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          {/* Error Message */}
          {error ? <Text style={styles.authError}>{error}</Text> : null}

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.authPrimaryButton, (!canSubmit || isLoading) && styles.authPrimaryButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.authPrimaryButtonText}>
                  {isSignInMode ? 'Signing in...' : 'Creating account...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.authPrimaryButtonText}>
                {isSignInMode ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Sign In / Sign Up */}
          <TouchableOpacity
            style={styles.authToggleButton}
            onPress={() => setIsSignInMode(!isSignInMode)}
            disabled={isLoading}
          >
            <Text style={styles.authToggleText}>
              {isSignInMode ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.authToggleTextBold}>
                {isSignInMode ? 'Create one' : 'Sign in'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.authDivider}>
          <View style={styles.authDividerLine} />
          <Text style={styles.authDividerText}>or</Text>
          <View style={styles.authDividerLine} />
        </View>

        {/* Anonymous Quick Start */}
        <TouchableOpacity
          style={styles.anonymousButton}
          onPress={onSignInAnonymous}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <Sparkles size={18} color={Colors.light.tint} />
          <Text style={styles.anonymousButtonText}>Continue Anonymously (Quick Start)</Text>
        </TouchableOpacity>

        <Text style={styles.anonymousHint}>
          Skip account creation and start right away. You can create an account later.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================
// PROGRESS INDICATOR
// ============================================

function ProgressDots({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            index === currentStep && styles.progressDotActive,
            index < currentStep && styles.progressDotCompleted,
          ]}
        />
      ))}
    </View>
  );
}

// ============================================
// MAIN SCREEN
// ============================================

const STEPS: OnboardingStep[] = ['welcome', 'intent', 'profile', 'notifications', 'signin'];

export default function OnboardingScreen() {
  const { signIn, signUpWithEmail, signInWithEmail, isLoading: authLoading } = useAuth();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const currentStep = STEPS[currentStepIndex];
  const showLoading = isLoading || authLoading;

  function goToNextStep() {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }

  function toggleIntent(id: string) {
    setSelectedIntents((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  // Helper to format Firebase auth errors
  function getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Try signing in instead.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/user-not-found':
        return 'No account found with this email. Try creating one.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  // Complete onboarding after successful auth
  async function completeOnboarding(userId: string) {
    if (!selectedRole) return;

    // Save user profile locally
    await saveUserProfile({
      name: name.trim(),
      role: selectedRole,
      createdAt: new Date().toISOString(),
    });

    // Create user profile in Firestore (with invite code)
    await createUserProfile(userId, name.trim(), selectedRole);
  }

  async function handleSignInAnonymous() {
    if (!selectedRole) return;

    setIsLoading(true);
    setError('');

    try {
      const userCredential = await signIn();
      if (userCredential?.user) {
        await completeOnboarding(userCredential.user.uid);
      }
      // Navigation will be handled by the auth state change in _layout.tsx
    } catch (err: any) {
      console.error('Error during anonymous sign-in:', err);
      setError(getAuthErrorMessage(err?.code));
      setIsLoading(false);
    }
  }

  async function handleSignUp(email: string, password: string) {
    if (!selectedRole) return;

    setIsLoading(true);
    setError('');

    try {
      const userCredential = await signUpWithEmail(email, password);
      if (userCredential?.user) {
        await completeOnboarding(userCredential.user.uid);
      }
      // Navigation will be handled by the auth state change in _layout.tsx
    } catch (err: any) {
      console.error('Error during sign-up:', err);
      setError(getAuthErrorMessage(err?.code));
      setIsLoading(false);
    }
  }

  async function handleSignIn(email: string, password: string) {
    setIsLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmail(email, password);
      // For existing users, we just sign them in - profile already exists
      // Navigation will be handled by the auth state change in _layout.tsx
      if (userCredential?.user && selectedRole) {
        // Update profile if they went through onboarding again
        await completeOnboarding(userCredential.user.uid);
      }
    } catch (err: any) {
      console.error('Error during sign-in:', err);
      setError(getAuthErrorMessage(err?.code));
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Progress Indicator */}
      <ProgressDots currentStep={currentStepIndex} totalSteps={STEPS.length} />

      {/* Step Content */}
      {currentStep === 'welcome' && <WelcomeStep onNext={goToNextStep} />}
      {currentStep === 'intent' && (
        <IntentStep
          selectedIntents={selectedIntents}
          onToggleIntent={toggleIntent}
          onNext={goToNextStep}
        />
      )}
      {currentStep === 'profile' && (
        <ProfileStep
          name={name}
          setName={setName}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          onNext={goToNextStep}
        />
      )}
      {currentStep === 'notifications' && <NotificationsStep onNext={goToNextStep} />}
      {currentStep === 'signin' && (
        <SignInStep
          isLoading={showLoading}
          error={error}
          onSignUp={handleSignUp}
          onSignIn={handleSignIn}
          onSignInAnonymous={handleSignInAnonymous}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },

  // Progress Dots
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.border,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: Colors.light.tint,
  },
  progressDotCompleted: {
    backgroundColor: Colors.light.tint,
  },

  // Step Container
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  // Welcome Step
  illustrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: 260,
  },
  infinityCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.light.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  floatingHearts: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  floatingHeart1: {
    position: 'absolute',
    top: '22%',
    right: '28%',
  },
  floatingHeart2: {
    position: 'absolute',
    bottom: '32%',
    left: '22%',
  },
  floatingSpark: {
    position: 'absolute',
    top: '38%',
    left: '32%',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },

  // Step Headers
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Intent Step
  intentsList: {
    flex: 1,
    marginBottom: 20,
  },
  intentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: Colors.light.border,
    gap: 12,
  },
  intentItemSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.highlight,
  },
  intentIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.light.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentIconSelected: {
    backgroundColor: '#FFFFFF',
  },
  intentLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
  },
  intentLabelSelected: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile Step
  profileForm: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  roleCardSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.highlight,
  },
  roleEmoji: {
    fontSize: 26,
    marginBottom: 6,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  roleLabelSelected: {
    color: Colors.light.tint,
  },
  roleDescription: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },

  // Notifications Step
  notificationIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 28,
  },
  bellCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.light.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: SCREEN_WIDTH / 2 - 75,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.light.secondaryTint,
    borderWidth: 3,
    borderColor: Colors.light.background,
  },
  notificationDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  notificationFeatures: {
    gap: 12,
    marginBottom: 36,
  },
  notificationFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  notificationFeatureText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },

  // Sign-In Step
  signinHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  signinIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.light.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  signinDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // Auth Form
  authForm: {
    gap: 16,
  },
  authInputGroup: {
    gap: 6,
  },
  authInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 4,
  },
  authInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  authError: {
    color: Colors.light.error,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  authPrimaryButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  authPrimaryButtonDisabled: {
    backgroundColor: Colors.light.border,
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  authPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  authToggleButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  authToggleText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  authToggleTextBold: {
    color: Colors.light.tint,
    fontWeight: '600',
  },

  // Divider
  authDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  authDividerText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },

  // Anonymous Button
  anonymousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  anonymousButtonText: {
    fontSize: 15,
    color: Colors.light.tint,
    fontWeight: '600',
  },
  anonymousHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
  },

  // Buttons
  primaryButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 'auto',
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.light.border,
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonTextDisabled: {
    color: Colors.light.textSecondary,
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipButtonText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
});
