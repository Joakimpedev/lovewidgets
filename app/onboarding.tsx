/**
 * Onboarding Flow for LoveWidgets
 * 4-step sequential screens: Welcome → Profile → Notifications → Sign-In
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  Check,
  Home,
  Mail,
  MessageSquare,
  Sparkles,
  Sprout
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { createUserProfile } from '@/utils/pairing';
import { saveUserProfile, UserRole } from '@/utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES & DATA
// ============================================

type OnboardingStep = 'welcome' | 'profile' | 'notifications' | 'signin';


// ============================================
// STEP COMPONENTS
// ============================================

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const features = [
    {
      icon: Home,
      text: 'Send fun drawings and messages directly to your partner\'s home screen',
    },
    {
      icon: MessageSquare,
      text: 'Learn more about eachother through daily questions - from fun and casual to meaningful and deep',
    },
    {
      icon: Sprout,
      text: 'Relationships needs attention and care! Build a shared virtual garden from coins you earn every day',
    },
  ];

  const cardWidth = SCREEN_WIDTH - 80;
  const cardSpacing = 16;
  const horizontalPadding = 24;

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const totalCardWidth = cardWidth + cardSpacing;
    const index = Math.round(scrollPosition / totalCardWidth);
    const clampedIndex = Math.min(Math.max(index, 0), features.length - 1);
    setActiveIndex(clampedIndex);
  };

  return (
    <View style={styles.stepContainer}>
      {/* Bee Avatar at Top */}
      <View style={styles.beeAvatarContainer}>
        <Image
          source={require('@/assets/bee/happy_heart.png')}
          style={styles.beeAvatar}
          resizeMode="contain"
        />
      </View>

      {/* Welcome Text Below Avatar */}
      <View style={styles.textContainer}>
        <Text style={styles.welcomeTitle}>Welcome to LoveWidgets</Text>
        <Text style={styles.welcomeSubtitle}>
          A beautiful way to stay connected with the people you love, right on their home screen.
        </Text>
      </View>

      {/* Horizontal Scrollable Feature Cards with Pagination */}
      <View style={styles.featuresWrapper}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          style={styles.featuresScrollView}
          contentContainerStyle={styles.featuresScrollContent}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + cardSpacing}
          snapToAlignment="start"
          decelerationRate="fast"
          pagingEnabled={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            const isLast = index === features.length - 1;
            return (
              <View
                key={index}
                style={[
                  styles.featureSquare,
                  index === 1 && styles.featureSquareRotated,
                  index === 2 && styles.featureSquareRotatedReverse,
                  isLast && styles.featureSquareLast,
                ]}
              >
                <View style={styles.featureIconContainer}>
                  <IconComponent size={40} color={Colors.light.tint} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Pagination Indicators - Right Under Cards */}
        <View style={styles.paginationContainer}>
          {features.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationIndicator,
                index === activeIndex && styles.paginationIndicatorActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Continue Button - Always Active */}
      <TouchableOpacity style={styles.primaryButton} onPress={onNext} activeOpacity={0.85}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

function ProfileStep({
  name,
  setName,
  onNext,
}: {
  name: string;
  setName: (name: string) => void;
  onNext: () => void;
}) {
  const canContinue = name.trim().length >= 2;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.stepContainer}
    >
      <View style={styles.profileCenteredContainer}>
        {/* Bee Avatar */}
        <View style={styles.profileBeeAvatarContainer}>
          <Image
            source={require('@/assets/bee/angled_right.png')}
            style={styles.profileBeeAvatar}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.stepTitle}>What does your partner call you?</Text>

        <View style={styles.profileForm}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
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
      </View>
    </KeyboardAvoidingView>
  );
}

function NotificationsStep({ onNext }: { onNext: () => void }) {
  const [isRequesting, setIsRequesting] = useState(false);

  async function handleEnableNotifications() {
    setIsRequesting(true);
    try {
      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus === 'granted') {
        // Get the push token (needed for sending notifications)
        if (Platform.OS !== 'web') {
          try {
            await Notifications.getExpoPushTokenAsync();
          } catch (tokenError: any) {
            // If aps-environment entitlement is missing, this will fail
            // But we can still continue - local notifications will work
            console.warn('Could not get push token (may need rebuild with entitlements):', tokenError?.message);
          }
        }
      }
    } catch (error: any) {
      console.error('Error requesting notification permissions:', error);
      // If the error is about aps-environment, it means the app needs to be rebuilt
      // But we can still continue - the user can enable notifications later
      if (error?.message?.includes('aps-environment')) {
        console.warn('Push notification entitlement missing. Rebuild the app to enable push notifications.');
      }
    } finally {
      setIsRequesting(false);
      onNext();
    }
  }

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
        Get notified when someone sends you a note, so you never miss a moment of love.
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

      <TouchableOpacity 
        style={[styles.primaryButton, isRequesting && styles.primaryButtonDisabled]} 
        onPress={handleEnableNotifications} 
        activeOpacity={0.85}
        disabled={isRequesting}
      >
        {isRequesting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Requesting...</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonText}>Enable Notifications</Text>
        )}
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
  onSignInWithApple,
  onSignInWithGoogle,
}: {
  isLoading: boolean;
  error: string;
  onSignUp: (email: string, password: string) => void;
  onSignIn: (email: string, password: string) => void;
  onSignInAnonymous: () => void;
  onSignInWithApple: () => void;
  onSignInWithGoogle: () => void;
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

        {/* Social Sign-In Buttons */}
        <View style={styles.socialAuthContainer}>
          {/* Google Sign In - Primary on Android, also available on iOS */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={onSignInWithGoogle}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            <View style={styles.googleButtonContent}>
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>
                {Platform.OS === 'android' ? 'Continue with Google' : 'Continue with Google'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Apple Sign In (iOS only) */}
          {Platform.OS === 'ios' && !isLoading && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={14}
              style={styles.appleButton}
              onPress={onSignInWithApple}
            />
          )}
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

const STEPS: OnboardingStep[] = ['welcome', 'profile', 'notifications', 'signin'];

export default function OnboardingScreen() {
  const { signIn, signUpWithEmail, signInWithEmail, signInWithApple, signInWithGoogle, isLoading: authLoading } = useAuth();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const currentStep = STEPS[currentStepIndex];
  const showLoading = isLoading || authLoading;

  function goToNextStep() {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
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
    // Use 'Partner' as default role
    const defaultRole: UserRole = 'Partner';

    // Save user profile locally
    await saveUserProfile({
      name: name.trim(),
      role: defaultRole,
      createdAt: new Date().toISOString(),
    });

    // Create user profile in Firestore (with invite code)
    await createUserProfile(userId, name.trim(), defaultRole);
  }

  async function handleSignInAnonymous() {
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
      if (userCredential?.user && name.trim().length >= 2) {
        // Update profile if they went through onboarding again
        await completeOnboarding(userCredential.user.uid);
      }
    } catch (err: any) {
      console.error('Error during sign-in:', err);
      setError(getAuthErrorMessage(err?.code));
      setIsLoading(false);
    }
  }

  async function handleSignInWithApple() {
    setIsLoading(true);
    setError('');

    try {
      const userCredential = await signInWithApple();
      if (userCredential?.user) {
        await completeOnboarding(userCredential.user.uid);
      }
      // Navigation will be handled by the auth state change in _layout.tsx
    } catch (err: any) {
      console.error('Error during Apple sign-in:', err);
      // Don't show error if user canceled
      if (err?.message?.includes('canceled')) {
        setError('');
      } else {
        setError(err?.message || 'Failed to sign in with Apple. Please try again.');
      }
      setIsLoading(false);
    }
  }

  async function handleSignInWithGoogle() {
    setIsLoading(true);
    setError('');

    try {
      const userCredential = await signInWithGoogle();
      if (userCredential?.user) {
        await completeOnboarding(userCredential.user.uid);
      }
      // Navigation will be handled by the auth state change in _layout.tsx
    } catch (err: any) {
      console.error('Error during Google sign-in:', err);
      // Don't show error if user canceled
      if (err?.message?.includes('canceled')) {
        setError('');
      } else {
        setError(err?.message || 'Failed to sign in with Google. Please try again.');
      }
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
      {currentStep === 'profile' && (
        <ProfileStep
          name={name}
          setName={setName}
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
          onSignInWithApple={handleSignInWithApple}
          onSignInWithGoogle={handleSignInWithGoogle}
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
    marginTop: 16,
    marginBottom: 24,
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
  // Feature Squares - Horizontal Scrollable
  featuresWrapper: {
    marginVertical: 16,
  },
  featuresScrollView: {
    marginBottom: 12,
  },
  featuresScrollContent: {
    paddingLeft: 24,
    paddingRight: 24,
    paddingVertical: 8,
    alignItems: 'center',
  },
  featureSquare: {
    width: SCREEN_WIDTH - 80,
    minHeight: 180,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.light.border,
    marginRight: 16,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  featureSquareLast: {
    marginRight: 0,
  },
  featureSquareRotated: {
    transform: [{ rotate: '3deg' }],
  },
  featureSquareRotatedReverse: {
    transform: [{ rotate: '-3deg' }],
  },
  featureIconContainer: {
    marginBottom: 16,
  },
  featureText: {
    fontSize: 15,
    color: Colors.light.text,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  // Bee Avatar
  beeAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  beeAvatar: {
    width: 120,
    height: 120,
  },
  // Pagination Indicators
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 4,
    minHeight: 16,
  },
  paginationIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.tint,
    marginHorizontal: 4,
    opacity: 0.3,
  },
  paginationIndicatorActive: {
    width: 32,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.tint,
    marginHorizontal: 4,
    opacity: 1,
  },
  // Profile Centered Container
  profileCenteredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileBeeAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  profileBeeAvatar: {
    width: 100,
    height: 100,
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

  // Profile Step
  profileForm: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 24,
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
    width: '100%',
  },

  // Notifications Step
  notificationIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 28,
    width: '100%',
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
    left: '50%',
    marginLeft: 57,
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
    paddingHorizontal: 24,
    width: '100%',
  },
  notificationFeatures: {
    gap: 12,
    marginBottom: 36,
    width: '100%',
    alignItems: 'center',
  },
  notificationFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
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

  // Social Auth
  socialAuthContainer: {
    gap: 12,
    marginTop: 8,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  googleButtonText: {
    color: Colors.light.text,
    fontSize: 16,
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
    width: '100%',
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
    width: '100%',
  },
  skipButtonText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
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
