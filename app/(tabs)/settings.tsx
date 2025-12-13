/**
 * Profile Screen for LoveWidgets
 * - Profile section with avatar and name
 * - Connection section (invite code + enter partner code)
 * - Layout settings
 * - Notification settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  User,
  Heart,
  HeartCrack,
  Copy,
  Check,
  Link,
  Palette,
  Bell,
  BellRing,
  MessageSquare,
  Pencil,
  Unlink,
  Trash2,
  Clock,
  UserPlus,
  X,
  Send,
  Camera,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useTheme, ThemeId } from '@/context/ThemeContext';
import { getUserProfile, getOnboardingState, setOnboardingState } from '@/utils/storage';
import {
  generateInviteCode,
  findUserByInviteCode,
  subscribeToUserProfile,
  disconnectPartner,
  sendConnectionRequest,
  subscribeToSentRequest,
  subscribeToIncomingRequests,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelSentRequest,
  updateProfilePhoto,
  updatePartnerNickname,
  UserProfile as FirestoreProfile,
  ConnectionRequest,
} from '@/utils/pairing';
import { resetTodaysQuestionStatus } from '@/utils/questionOfTheDay';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';

// ============================================
// CONSTANTS
// ============================================

const THEME_OPTIONS: Array<{ id: ThemeId; color: string }> = [
  { id: 'yellow', color: '#B8860B' },  // Default honey/brown theme
  { id: 'blue', color: '#5998DE' },
  { id: 'pink', color: '#E87BA4' },
  { id: 'purple', color: '#A78BDE' },
];

// ============================================
// COMPONENTS
// ============================================

interface AvatarPlaceholderProps {
  label: string;
  isConnected?: boolean;
  colors: typeof Colors.light;
  size?: number;
  photoURL?: string | null;
}

function AvatarPlaceholder({ label, isConnected, colors, size = 64, photoURL }: AvatarPlaceholderProps) {
  return (
    <View style={styles.avatarContainer}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isConnected ? colors.tint + '20' : colors.border,
            overflow: 'hidden',
          },
        ]}
      >
        {photoURL ? (
          <Image 
            source={{ uri: photoURL }} 
            style={{ width: size, height: size }}
          />
        ) : (
          <User size={size * 0.45} color={isConnected ? colors.tint : colors.textSecondary} />
        )}
      </View>
      <Text style={[styles.avatarLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// Reusable Card component with shadow wrapper pattern
interface CardProps {
  children: React.ReactNode;
  colors: typeof Colors.light;
  style?: object;
  isRequest?: boolean;
}

function Card({ children, colors, style, isRequest }: CardProps) {
  return (
    <View style={[
      styles.cardShadowWrapper,
      { backgroundColor: isRequest ? colors.tint + '10' : colors.cardBackground },
    ]}>
      <View style={[
        styles.cardInner,
        { backgroundColor: isRequest ? colors.tint + '10' : colors.cardBackground },
        isRequest && styles.requestCardBorder,
        isRequest && { borderColor: colors.tint },
        style,
      ]}>
        {children}
      </View>
    </View>
  );
}

// Identity Card component with shadow wrapper
interface IdentityCardProps {
  children: React.ReactNode;
  colors: typeof Colors.light;
}

function IdentityCard({ children, colors }: IdentityCardProps) {
  return (
    <View style={[styles.identityCardShadow, { backgroundColor: colors.cardBackground }]}>
      <View style={[styles.identityCardInner, { backgroundColor: colors.cardBackground }]}>
        {children}
      </View>
    </View>
  );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const { themeId, setTheme, colors: themeColors } = useTheme();
  // Colors already have visual theme applied globally in ThemeContext
  const colors = themeColors[colorScheme ?? 'light'];
  const { user, signOut } = useAuth();
  const router = useRouter();

  // State
  const [userName, setUserName] = useState('You');
  const [inviteCode, setInviteCode] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Partner state (from Firestore listener)
  const [firestoreProfile, setFirestoreProfile] = useState<FirestoreProfile | null>(null);
  const isConnected = !!firestoreProfile?.partnerId;
  
  // Request states
  const [sentRequest, setSentRequest] = useState<ConnectionRequest | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Nickname editing state
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  
  // Notification settings state
  const [notifyNewLetters, setNotifyNewLetters] = useState(true);
  const [notifyNudges, setNotifyNudges] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(false);

  // Load local profile and generate invite code
  useEffect(() => {
    async function loadProfile() {
      const profile = await getUserProfile();
      if (profile) {
        setUserName(profile.name);
      }
      
      if (user) {
        const code = generateInviteCode(user.uid);
        setInviteCode(code);
      }
    }
    loadProfile();
  }, [user]);

  // Subscribe to Firestore profile changes (real-time partner updates)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserProfile(user.uid, (profile) => {
      setFirestoreProfile(profile);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to sent pending request (real-time)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToSentRequest(user.uid, (request) => {
      setSentRequest(request);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to incoming pending requests (real-time)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToIncomingRequests(user.uid, (requests) => {
      setIncomingRequests(requests);
    });

    return () => unsubscribe();
  }, [user]);

  // Copy invite code
  async function handleCopyCode() {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Send connection request
  async function handleSendRequest() {
    if (!user || partnerCode.trim().length === 0) {
      Alert.alert('Enter Code', 'Please enter your partner\'s invite code.');
      return;
    }

    // Can't connect to yourself
    if (partnerCode.toUpperCase().includes(user.uid.substring(0, 6).toUpperCase())) {
      Alert.alert('Oops!', 'You can\'t connect with yourself!');
      return;
    }

    setIsConnecting(true);

    try {
      // Search for user with this invite code
      const result = await findUserByInviteCode(partnerCode);

      if (!result) {
        Alert.alert('Not Found', 'No user found with that invite code. Please check and try again.');
        setIsConnecting(false);
        return;
      }

      // Check if they're already connected to someone
      if (result.profile.partnerId) {
        Alert.alert('Already Connected', 'This user is already connected with someone else.');
        setIsConnecting(false);
        return;
      }

      // Send connection request (don't connect directly)
      await sendConnectionRequest(
        user.uid,
        userName,
        result.id,
        result.profile.name
      );

      Alert.alert('Request Sent! 💌', `Waiting for ${result.profile.name} to accept your request.`);
      setPartnerCode('');
    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  }

  // Accept incoming request
  async function handleAcceptRequest(request: ConnectionRequest) {
    if (!request.id) return;

    setIsAccepting(true);
    try {
      await acceptConnectionRequest(request.id, request);
      Alert.alert('Connected! 💕', `You are now connected with ${request.fromUserName}!`);
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  }

  // Decline incoming request
  async function handleDeclineRequest(request: ConnectionRequest) {
    if (!request.id) return;

    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline ${request.fromUserName}'s request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setIsDeclining(true);
            try {
              await declineConnectionRequest(request.id!);
            } catch (error) {
              console.error('Error declining request:', error);
              Alert.alert('Error', 'Something went wrong.');
            } finally {
              setIsDeclining(false);
            }
          },
        },
      ]
    );
  }

  // Cancel my sent request
  async function handleCancelRequest() {
    if (!sentRequest?.id) return;

    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel your connection request?',
      [
        { text: 'Keep Waiting', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await cancelSentRequest(sentRequest.id!);
            } catch (error) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Something went wrong.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  }

  // Disconnect from partner
  async function handleDisconnect() {
    if (!user || !firestoreProfile?.partnerId) return;

    Alert.alert(
      'Disconnect',
      `Are you sure you want to disconnect from ${firestoreProfile.partnerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectPartner(user.uid, firestoreProfile.partnerId!);
              Alert.alert('Disconnected', 'You have been disconnected.');
            } catch (error) {
              console.error('Error disconnecting:', error);
              Alert.alert('Error', 'Something went wrong.');
            }
          },
        },
      ]
    );
  }

  // Pick and upload profile photo
  async function handlePickPhoto() {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile photo.');
        return;
      }

      // On Android, show helpful tip about crop button
      if (Platform.OS === 'android') {
        Alert.alert(
          'Crop Your Photo',
          'After selecting your photo, you can adjust the crop. Look for the checkmark (✓) button in the top-right corner to confirm.',
          [
            { text: 'Got it', onPress: () => launchImagePicker() }
          ]
        );
      } else {
        launchImagePicker();
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to update profile photo.');
    }
  }

  // Launch image picker
  async function launchImagePicker() {
    try {
      // Launch picker
      // On Android, allowsEditing shows a crop screen - user needs to confirm crop
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Compress for base64 storage
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      // Get the image URI (edited if available, otherwise original)
      const asset = result.assets[0];
      const uri = asset.uri;

      // Convert to base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const photoData = `data:image/jpeg;base64,${base64}`;

      // Upload to Firestore
      if (user) {
        await updateProfilePhoto(user.uid, photoData, firestoreProfile?.partnerId || null);
        // Photo will update automatically via subscription
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to update profile photo.');
    }
  }

  // Edit partner nickname
  function handleEditPartnerNickname() {
    if (!user || !firestoreProfile?.partnerId) return;
    setNicknameInput(firestoreProfile?.nicknameForPartner || '');
    setShowNicknameModal(true);
  }

  // Save nickname
  async function handleSaveNickname() {
    if (!user || !firestoreProfile?.partnerId) return;
    
    try {
      await updatePartnerNickname(
        user.uid,
        firestoreProfile.partnerId,
        nicknameInput.trim() || null
      );
      setShowNicknameModal(false);
    } catch (error) {
      console.error('Error updating nickname:', error);
      Alert.alert('Error', 'Failed to update nickname.');
    }
  }

  // Edit profile
  function handleEditProfile() {
    Alert.alert('Edit Profile', 'Profile editing will be available soon!');
  }

  // DEV: Reset question of the day
  async function handleDevResetQuestion() {
    if (!user?.uid) return;

    Alert.alert(
      'DEV: Reset Question of the Day',
      'This will reset your reveal status and answer for today\'s question. The question will remain the same.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetTodaysQuestionStatus(user.uid);
              Alert.alert('Success', 'Question of the day has been reset!');
            } catch (error) {
              console.error('Error resetting question:', error);
              Alert.alert('Error', 'Failed to reset question. Please try again.');
            }
          },
        },
      ]
    );
  }

  // DEV: Reset theme purchases
  async function handleDevResetThemes() {
    if (!user?.uid) return;

    Alert.alert(
      'DEV: Reset Theme Purchases',
      'This will reset all purchased themes. Only the default theme will remain. You can purchase themes again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const userDocRef = doc(db, 'users', user.uid);
              await updateDoc(userDocRef, {
                'ownedThemes': ['default'],
                updatedAt: serverTimestamp(),
              });
              Alert.alert('Success', 'Theme purchases have been reset!');
            } catch (error) {
              console.error('Error resetting themes:', error);
              Alert.alert('Error', 'Failed to reset themes. Please try again.');
            }
          },
        },
      ]
    );
  }

  // DEV: Reset first plant flags
  async function handleDevResetFirstPlants() {
    if (!user?.uid || !firestoreProfile?.partnerId) {
      Alert.alert('Error', 'You must be connected to a partner to use this tool.');
      return;
    }

    Alert.alert(
      'DEV: Reset First Plant Flags',
      'This will reset the first plant flags so you can see the first plant modals again for each category.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const { updateSharedGardenState } = await import('@/utils/gardenState');
              await updateSharedGardenState(user.uid, firestoreProfile.partnerId, {
                firstPlantFlower: false,
                firstPlantLargePlant: false,
                firstPlantTree: false,
              });
              Alert.alert('Success', 'First plant flags have been reset!');
            } catch (error) {
              console.error('Error resetting first plant flags:', error);
              Alert.alert('Error', 'Failed to reset first plant flags. Please try again.');
            }
          },
        },
      ]
    );
  }

  // DEV: Set garden to wilted state (24+ hours ago)
  async function handleDevSetWilted() {
    if (!user?.uid || !firestoreProfile?.partnerId) {
      Alert.alert('Error', 'You must be connected to a partner to use this tool.');
      return;
    }

    Alert.alert(
      'DEV: Set Garden to Wilted State',
      'This will set the garden to wilted state by setting lastSuccessfulInteraction to 25 hours ago. This allows you to test the wilted revival modal.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set Wilted',
          style: 'destructive',
          onPress: async () => {
            try {
              const { updateSharedGardenState } = await import('@/utils/gardenState');
              // Set lastSuccessfulInteraction to 25 hours ago (ensures wilted state)
              const now = Date.now();
              const twentyFiveHoursAgo = now - (25 * 60 * 60 * 1000);
              await updateSharedGardenState(user.uid, firestoreProfile.partnerId, {
                lastSuccessfulInteraction: Timestamp.fromMillis(twentyFiveHoursAgo),
              });
              Alert.alert('Success', 'Garden has been set to wilted state! Try watering to see the revival modal.');
            } catch (error) {
              console.error('Error setting garden to wilted:', error);
              Alert.alert('Error', 'Failed to set garden to wilted state. Please try again.');
            }
          },
        },
      ]
    );
  }

  // DEV: Reset onboarding state
  async function handleDevResetOnboarding() {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to use this tool.');
      return;
    }

    Alert.alert(
      'DEV: Reset Onboarding State',
      'This will reset all onboarding flags. If you are already connected, you will see the "Linked! ❤️" tutorial message.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Onboarding',
          style: 'destructive',
          onPress: async () => {
            try {
              // Reset all onboarding flags
              await setOnboardingState({
                isConnected: false,
                hasCompletedTutorial: false,
                hasPlantedFirstFlower: false,
                hasReceivedStarterBudget: false,
              });

              // If user is already connected, mark as connected but keep tutorial incomplete
              // This will trigger Step 2 (the "Linked!" message)
              if (firestoreProfile?.partnerId) {
                await setOnboardingState({
                  isConnected: true,
                  hasCompletedTutorial: false, // Keep this false to trigger tutorial
                  hasPlantedFirstFlower: false,
                  hasReceivedStarterBudget: false,
                });
                Alert.alert('Success', 'Onboarding state reset! Navigate to home to see the tutorial.');
              } else {
                Alert.alert('Success', 'Onboarding state reset! You will see the welcome overlay when you go to home.');
              }
            } catch (error) {
              console.error('Error resetting onboarding:', error);
              Alert.alert('Error', 'Failed to reset onboarding state. Please try again.');
            }
          },
        },
      ]
    );
  }

  // DEV: Reset everything
  async function handleDevReset() {
    Alert.alert(
      'DEV: Reset Everything',
      'This will clear all app data, sign you out, and return to onboarding. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all AsyncStorage data
              await AsyncStorage.clear();
              
              // Sign out from Firebase
              await signOut();
              
              // Navigate to onboarding
              router.replace('/onboarding');
            } catch (error) {
              console.error('Error resetting app:', error);
              Alert.alert('Error', 'Failed to reset app. Please try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================ */}
        {/* PROFILE HEADER */}
        {/* ============================================ */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              style={[styles.mainAvatar, { backgroundColor: colors.tint + '20' }]}
              onPress={handlePickPhoto}
              activeOpacity={0.8}
            >
              {firestoreProfile?.photoURL ? (
                <Image 
                  source={{ uri: firestoreProfile.photoURL }} 
                  style={styles.mainAvatarImage}
                />
              ) : (
                <User size={32} color={colors.tint} />
              )}
            </TouchableOpacity>
            {/* Camera icon overlay - positioned in corner outside the circle */}
            <TouchableOpacity
              style={[styles.cameraOverlay, { backgroundColor: colors.tint }]}
              onPress={handlePickPhoto}
              activeOpacity={0.8}
            >
              <Camera size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{userName}</Text>
            <TouchableOpacity onPress={handlePickPhoto}>
              <Text style={[styles.profileSubtext, { color: colors.tint }]}>
                {firestoreProfile?.photoURL ? 'Change photo' : 'Tap to add a photo'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.border }]}
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            <Pencil size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ============================================ */}
        {/* IDENTITY HEADER - You & Partner */}
        {/* ============================================ */}
        <IdentityCard colors={colors}>
          <View style={styles.identityRow}>
            <AvatarPlaceholder 
              label={firestoreProfile?.nicknameFromPartner || userName} 
              isConnected={true} 
              colors={colors}
              photoURL={firestoreProfile?.photoURL}
            />
            
            {/* Connection indicator */}
            <View style={styles.connectionIndicator}>
              {isConnected ? (
                <Heart size={24} color={colors.tint} fill={colors.tint} />
              ) : (
                <HeartCrack size={24} color={colors.textSecondary} />
              )}
            </View>
            
            <AvatarPlaceholder 
              label={firestoreProfile?.nicknameForPartner || firestoreProfile?.partnerName || 'Partner'} 
              isConnected={isConnected} 
              colors={colors}
              photoURL={firestoreProfile?.partnerPhotoURL}
            />
          </View>
          <Text style={[styles.connectionStatus, { color: isConnected ? colors.tint : colors.textSecondary }]}>
            {isConnected ? `Connected with ${firestoreProfile?.partnerName} 💕` : 'Not connected yet'}
          </Text>
          
          {/* Nickname editor for partner - only show if connected */}
          {isConnected && (
            <TouchableOpacity
              style={[styles.nicknameButton, { backgroundColor: colors.highlight }]}
              onPress={handleEditPartnerNickname}
              activeOpacity={0.7}
            >
              <Pencil size={14} color={colors.tint} />
              <Text style={[styles.nicknameButtonText, { color: colors.tint }]}>
                {firestoreProfile?.nicknameForPartner ? 'Change nickname' : 'Give them a nickname'}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Disconnect button if connected */}
          {isConnected && (
            <TouchableOpacity
              style={[styles.disconnectButton, { borderColor: colors.error }]}
              onPress={handleDisconnect}
              activeOpacity={0.7}
            >
              <Unlink size={14} color={colors.error} />
              <Text style={[styles.disconnectText, { color: colors.error }]}>Disconnect</Text>
            </TouchableOpacity>
          )}
        </IdentityCard>

        {/* ============================================ */}
        {/* CONNECTION SECTION */}
        {/* ============================================ */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Connect</Text>

        {/* Card 1: My Invite Code */}
        <Card colors={colors}>
          <View style={styles.cardHeader}>
            <Link size={18} color={colors.tint} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Your Invite Code</Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Share this code with your partner
          </Text>
          
          <View style={styles.codeContainer}>
            <Text style={[styles.inviteCode, { color: colors.text }]}>
              {inviteCode || 'Loading...'}
            </Text>
            <TouchableOpacity
              style={[
                styles.copyButton,
                { backgroundColor: copied ? colors.success + '20' : colors.tint },
              ]}
              onPress={handleCopyCode}
              activeOpacity={0.8}
              disabled={!inviteCode}
            >
              {copied ? (
                <>
                  <Check size={16} color={colors.success} />
                  <Text style={[styles.copyButtonText, { color: colors.success }]}>Copied!</Text>
                </>
              ) : (
                <>
                  <Copy size={16} color="#FFFFFF" />
                  <Text style={styles.copyButtonText}>Copy</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Card>

        {/* Incoming Request Cards */}
        {incomingRequests.length > 0 && !isConnected && (
          <>
            {incomingRequests.map((request) => (
              <Card key={request.id} colors={colors} isRequest>
                <View style={styles.cardHeader}>
                  <UserPlus size={18} color={colors.tint} />
                  <Text style={[styles.cardTitle, { color: colors.tint }]}>New Connection Request!</Text>
                </View>
                <Text style={[styles.requestMessage, { color: colors.text }]}>
                  <Text style={{ fontWeight: '700' }}>{request.fromUserName}</Text> wants to connect with you
                </Text>
                
                <View style={styles.requestButtons}>
                  <TouchableOpacity
                    style={[styles.declineButton, { borderColor: colors.error }]}
                    onPress={() => handleDeclineRequest(request)}
                    activeOpacity={0.8}
                    disabled={isDeclining || isAccepting}
                  >
                    {isDeclining ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <X size={16} color={colors.error} />
                        <Text style={[styles.declineButtonText, { color: colors.error }]}>Decline</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: colors.tint }]}
                    onPress={() => handleAcceptRequest(request)}
                    activeOpacity={0.8}
                    disabled={isAccepting || isDeclining}
                  >
                    {isAccepting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={16} color="#FFFFFF" />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Card 2: Enter Partner Code OR Waiting State */}
        {!isConnected && (
          <Card colors={colors}>
            {sentRequest ? (
              // Waiting state - request has been sent
              <>
                <View style={styles.cardHeader}>
                  <Clock size={18} color={colors.streakFire} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Request Pending</Text>
                </View>
                <View style={styles.waitingContainer}>
                  <Text style={[styles.waitingText, { color: colors.textSecondary }]}>
                    Waiting for <Text style={{ fontWeight: '700', color: colors.text }}>{sentRequest.toUserName}</Text> to accept...
                  </Text>
                  <TouchableOpacity
                    style={[styles.cancelRequestButton, { borderColor: colors.error }]}
                    onPress={handleCancelRequest}
                    activeOpacity={0.8}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <X size={14} color={colors.error} />
                        <Text style={[styles.cancelRequestText, { color: colors.error }]}>Cancel Request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // Normal input state
              <>
                <View style={styles.cardHeader}>
                  <Send size={18} color={colors.tint} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Send Request</Text>
                </View>
                <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                  Enter their code to send a connection request
                </Text>
                
                <View style={styles.inputRow}>
                  <TextInput
                    style={[
                      styles.codeInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="e.g. ABC123"
                    placeholderTextColor={colors.textSecondary}
                    value={partnerCode}
                    onChangeText={setPartnerCode}
                    autoCapitalize="characters"
                    maxLength={8}
                    editable={!isConnecting}
                  />
                  <TouchableOpacity
                    style={[styles.connectButton, { backgroundColor: colors.tint }]}
                    onPress={handleSendRequest}
                    activeOpacity={0.8}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.connectButtonText}>Send</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Card>
        )}

        {/* ============================================ */}
        {/* THEME SETTINGS */}
        {/* ============================================ */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>

        <Card colors={colors}>
          <View style={styles.cardHeader}>
            <Palette size={18} color={colors.tint} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Color Theme</Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Choose your favorite color theme for the entire app
          </Text>
          
          <View style={styles.themePicker}>
            {THEME_OPTIONS.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeSwatch,
                  { backgroundColor: theme.color },
                  themeId === theme.id && styles.themeSwatchSelected,
                ]}
                onPress={() => setTheme(theme.id)}
                activeOpacity={0.8}
              >
                {themeId === theme.id && (
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ============================================ */}
        {/* NOTIFICATION SETTINGS */}
        {/* ============================================ */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>

        <Card colors={colors}>
          {/* New Letters */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: colors.tint + '20' }]}>
                <BellRing size={18} color={colors.tint} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>New Letters</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  When your partner sends a letter
                </Text>
              </View>
            </View>
            <Switch
              value={notifyNewLetters}
              onValueChange={setNotifyNewLetters}
              trackColor={{ false: colors.border, true: colors.tint + '60' }}
              thumbColor={notifyNewLetters ? colors.tint : colors.textSecondary}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Nudges */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: colors.streakFire + '20' }]}>
                <MessageSquare size={18} color={colors.streakFire} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Nudges</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  When your partner sends a nudge
                </Text>
              </View>
            </View>
            <Switch
              value={notifyNudges}
              onValueChange={setNotifyNudges}
              trackColor={{ false: colors.border, true: colors.tint + '60' }}
              thumbColor={notifyNudges ? colors.tint : colors.textSecondary}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Reminders */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: colors.success + '20' }]}>
                <Bell size={18} color={colors.success} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Daily Reminders</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Remind me to send a letter
                </Text>
              </View>
            </View>
            <Switch
              value={notifyReminders}
              onValueChange={setNotifyReminders}
              trackColor={{ false: colors.border, true: colors.tint + '60' }}
              thumbColor={notifyReminders ? colors.tint : colors.textSecondary}
            />
          </View>
        </Card>

        {/* ============================================ */}
        {/* DEV TOOLS */}
        {/* ============================================ */}
        <Text style={[styles.sectionTitle, { color: colors.error }]}>Developer</Text>

        <TouchableOpacity
          style={[styles.devResetButton, { backgroundColor: colors.tint }]}
          onPress={handleDevResetQuestion}
          activeOpacity={0.8}
        >
          <Clock size={20} color="#FFFFFF" />
          <Text style={styles.devResetButtonText}>DEV: Reset Question of the Day</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devResetButton, { backgroundColor: '#A78BDE' }]}
          onPress={handleDevResetThemes}
          activeOpacity={0.8}
        >
          <Palette size={20} color="#FFFFFF" />
          <Text style={styles.devResetButtonText}>DEV: Reset Theme Purchases</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devResetButton, { backgroundColor: '#7BC87B' }]}
          onPress={handleDevResetFirstPlants}
          activeOpacity={0.8}
        >
          <Clock size={20} color="#FFFFFF" />
          <Text style={styles.devResetButtonText}>DEV: Reset First Plant Flags</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devResetButton, { backgroundColor: '#8D6E63' }]}
          onPress={handleDevSetWilted}
          activeOpacity={0.8}
        >
          <AlertCircle size={20} color="#FFFFFF" />
          <Text style={styles.devResetButtonText}>DEV: Set Garden to Wilted</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devResetButton, { backgroundColor: '#FF9500' }]}
          onPress={handleDevResetOnboarding}
          activeOpacity={0.8}
        >
          <Sparkles size={20} color="#FFFFFF" />
          <Text style={styles.devResetButtonText}>DEV: Reset Onboarding State</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devResetButton, { backgroundColor: colors.error }]}
          onPress={handleDevReset}
          activeOpacity={0.8}
        >
          <Trash2 size={20} color="#FFFFFF" />
          <Text style={styles.devResetButtonText}>DEV: Reset Everything</Text>
        </TouchableOpacity>

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            LoveWidgets v1.0.0 💝
          </Text>
        </View>
      </ScrollView>

      {/* Nickname Modal */}
      <Modal
        visible={showNicknameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNicknameModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Give them a nickname
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              What would you like to call {firestoreProfile?.partnerName}?
            </Text>
            
            <TextInput
              style={[
                styles.nicknameInput,
                { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Enter nickname..."
              placeholderTextColor={colors.textSecondary}
              value={nicknameInput}
              onChangeText={setNicknameInput}
              autoFocus
              maxLength={20}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: colors.border }]}
                onPress={() => setShowNicknameModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.tint }]}
                onPress={handleSaveNickname}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
    width: 72,
    height: 72,
  },
  mainAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mainAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
  },
  profileSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Identity Card Shadow Wrapper
  identityCardShadow: {
    borderRadius: 20,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        // Clean border for Android instead of buggy elevation
        borderWidth: 1,
        borderColor: Colors.light.border,
      },
    }),
  },
  // Identity Card Inner
  identityCardInner: {
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  connectionIndicator: {
    marginHorizontal: 24,
  },
  connectionStatus: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 16,
    fontWeight: '500',
  },
  nicknameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  nicknameButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'center',
  },
  disconnectText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },

  // Card Shadow Wrapper
  cardShadowWrapper: {
    borderRadius: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        // Clean border for Android instead of buggy elevation
        borderWidth: 1,
        borderColor: Colors.light.border,
      },
    }),
  },
  // Card Inner
  cardInner: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  // Request Card Border (for incoming requests)
  requestCardBorder: {
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 13,
    marginBottom: 12,
  },

  // Invite Code
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviteCode: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Partner Code Input
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    letterSpacing: 1,
  },
  connectButton: {
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Request Card Styles (legacy - handled by Card component now)
  requestMessage: {
    fontSize: 15,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 22,
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  waitingText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  cancelRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  cancelRequestText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Theme Picker
  themePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  themeSwatch: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // Notification Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },

  // Dev Reset Button
  devResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  devResetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  footerText: {
    fontSize: 13,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  nicknameInput: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
