/**
 * Pairing Utilities for LoveWidgets
 * Handles invite code generation and partner connection logic
 * Uses a Request/Accept flow for secure pairing
 */

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  collection,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';

// ============================================
// TYPES
// ============================================

export interface UserProfile {
  odba: string;           // Unique invite code
  name: string;
  role: string;
  partnerId: string | null;
  partnerName: string | null;
  partnerPhotoURL: string | null;   // Partner's profile photo (base64)
  photoURL: string | null;          // User's profile photo (base64)
  nicknameForPartner: string | null; // Nickname YOU gave to your partner
  nicknameFromPartner: string | null; // Nickname your partner gave YOU
  isPremium: boolean;               // Premium subscription status
  createdAt: any;
  updatedAt: any;
}

export interface ConnectionRequest {
  id?: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}

// ============================================
// INVITE CODE GENERATION
// ============================================

/**
 * Generate a unique invite code from a user ID
 * Format: Just the first 6 characters (no LOVE- prefix)
 */
export function generateInviteCode(userId: string): string {
  // Take first 6 characters of user ID, uppercase
  return userId.substring(0, 6).toUpperCase();
}

/**
 * Normalize a code for searching (removes any accidental prefix)
 */
export function normalizeCode(code: string): string {
  // Remove LOVE- prefix if present (for backwards compatibility)
  return code.replace('LOVE-', '').toUpperCase().trim();
}

// ============================================
// FIRESTORE OPERATIONS - USER PROFILES
// ============================================

/**
 * Create or update user profile in Firestore
 */
export async function createUserProfile(
  userId: string,
  name: string,
  role: string
): Promise<UserProfile> {
  const inviteCode = generateInviteCode(userId);
  
  const profile: UserProfile = {
    odba: inviteCode,
    name,
    role,
    partnerId: null,
    partnerName: null,
    photoURL: null,
    partnerPhotoURL: null,
    nicknameForPartner: null,
    nicknameFromPartner: null,
    isPremium: false, // Default to free
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', userId), profile);
  return profile;
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfileFromFirestore(
  userId: string
): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

/**
 * Search for a user by their invite code
 */
export async function findUserByInviteCode(
  inviteCode: string
): Promise<{ id: string; profile: UserProfile } | null> {
  // Normalize the code (remove any prefix, uppercase)
  const normalizedCode = normalizeCode(inviteCode);

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('odba', '==', normalizedCode));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    profile: doc.data() as UserProfile,
  };
}

/**
 * Listen to user profile changes (for real-time partner updates)
 */
export function subscribeToUserProfile(
  userId: string,
  callback: (profile: UserProfile | null) => void
): () => void {
  const docRef = doc(db, 'users', userId);
  
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as UserProfile);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}

// ============================================
// CONNECTION REQUESTS
// ============================================

/**
 * Send a connection request to another user
 */
export async function sendConnectionRequest(
  fromUserId: string,
  fromUserName: string,
  toUserId: string,
  toUserName: string
): Promise<string> {
  const request: Omit<ConnectionRequest, 'id'> = {
    fromUserId,
    fromUserName,
    toUserId,
    toUserName,
    status: 'pending',
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'requests'), request);
  return docRef.id;
}

/**
 * Get pending request that I sent
 */
export async function getSentPendingRequest(
  userId: string
): Promise<ConnectionRequest | null> {
  const requestsRef = collection(db, 'requests');
  const q = query(
    requestsRef, 
    where('fromUserId', '==', userId),
    where('status', '==', 'pending')
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as ConnectionRequest;
}

/**
 * Get incoming pending requests to me
 */
export async function getIncomingPendingRequests(
  userId: string
): Promise<ConnectionRequest[]> {
  const requestsRef = collection(db, 'requests');
  const q = query(
    requestsRef, 
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as ConnectionRequest));
}

/**
 * Subscribe to sent pending request (real-time)
 */
export function subscribeToSentRequest(
  userId: string,
  callback: (request: ConnectionRequest | null) => void
): () => void {
  const requestsRef = collection(db, 'requests');
  const q = query(
    requestsRef, 
    where('fromUserId', '==', userId),
    where('status', '==', 'pending')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const doc = snapshot.docs[0];
      callback({ id: doc.id, ...doc.data() } as ConnectionRequest);
    }
  });

  return unsubscribe;
}

/**
 * Subscribe to incoming pending requests (real-time)
 */
export function subscribeToIncomingRequests(
  userId: string,
  callback: (requests: ConnectionRequest[]) => void
): () => void {
  const requestsRef = collection(db, 'requests');
  const q = query(
    requestsRef, 
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ConnectionRequest));
    callback(requests);
  });

  return unsubscribe;
}

/**
 * Accept a connection request
 * Links both users and deletes the request
 * Also syncs profile photos between partners
 */
export async function acceptConnectionRequest(
  requestId: string,
  request: ConnectionRequest
): Promise<void> {
  // Get both users' current profiles to sync photos
  const fromUserDoc = await getDoc(doc(db, 'users', request.fromUserId));
  const toUserDoc = await getDoc(doc(db, 'users', request.toUserId));
  
  const fromUserData = fromUserDoc.data();
  const toUserData = toUserDoc.data();

  // Update both users' profiles to link them and sync photos
  await updateDoc(doc(db, 'users', request.fromUserId), {
    partnerId: request.toUserId,
    partnerName: request.toUserName,
    partnerPhotoURL: toUserData?.photoURL || null, // Sync partner's photo
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'users', request.toUserId), {
    partnerId: request.fromUserId,
    partnerName: request.fromUserName,
    partnerPhotoURL: fromUserData?.photoURL || null, // Sync partner's photo
    updatedAt: serverTimestamp(),
  });

  // Delete the request
  await deleteDoc(doc(db, 'requests', requestId));
}

/**
 * Decline a connection request
 * Just deletes the request
 */
export async function declineConnectionRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, 'requests', requestId));
}

/**
 * Cancel my sent pending request
 */
export async function cancelSentRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, 'requests', requestId));
}

/**
 * Check if I already have a pending request to someone
 */
export async function hasPendingRequestTo(
  fromUserId: string,
  toUserId: string
): Promise<boolean> {
  const requestsRef = collection(db, 'requests');
  const q = query(
    requestsRef, 
    where('fromUserId', '==', fromUserId),
    where('toUserId', '==', toUserId),
    where('status', '==', 'pending')
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

// ============================================
// PARTNER CONNECTION (kept for backwards compatibility)
// ============================================

/**
 * Connect two users as partners (direct connection - used after accept)
 * @deprecated Use acceptConnectionRequest instead
 */
export async function connectPartners(
  myUserId: string,
  myName: string,
  partnerUserId: string,
  partnerName: string
): Promise<void> {
  // Update my profile with partner info
  await updateDoc(doc(db, 'users', myUserId), {
    partnerId: partnerUserId,
    partnerName: partnerName,
    updatedAt: serverTimestamp(),
  });

  // Update partner's profile with my info
  await updateDoc(doc(db, 'users', partnerUserId), {
    partnerId: myUserId,
    partnerName: myName,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Disconnect from partner
 */
export async function disconnectPartner(
  myUserId: string,
  partnerUserId: string
): Promise<void> {
  // Remove partner from my profile
  await updateDoc(doc(db, 'users', myUserId), {
    partnerId: null,
    partnerName: null,
    partnerPhotoURL: null,
    updatedAt: serverTimestamp(),
  });

  // Remove me from partner's profile
  await updateDoc(doc(db, 'users', partnerUserId), {
    partnerId: null,
    partnerName: null,
    partnerPhotoURL: null,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// PROFILE PHOTO
// ============================================

/**
 * Update user's profile photo
 * Also syncs to partner's partnerPhotoURL if connected
 */
export async function updateProfilePhoto(
  userId: string,
  photoBase64: string | null,
  partnerId: string | null
): Promise<void> {
  // Update my profile photo
  await updateDoc(doc(db, 'users', userId), {
    photoURL: photoBase64,
    updatedAt: serverTimestamp(),
  });

  // If connected, sync to partner's partnerPhotoURL
  if (partnerId) {
    await updateDoc(doc(db, 'users', partnerId), {
      partnerPhotoURL: photoBase64,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Update the nickname you give to your partner
 * This updates your nicknameForPartner AND their nicknameFromPartner
 */
export async function updatePartnerNickname(
  userId: string,
  partnerId: string,
  nickname: string | null
): Promise<void> {
  // Update my nicknameForPartner
  await updateDoc(doc(db, 'users', userId), {
    nicknameForPartner: nickname,
    updatedAt: serverTimestamp(),
  });

  // Update partner's nicknameFromPartner (what they see on their screen)
  await updateDoc(doc(db, 'users', partnerId), {
    nicknameFromPartner: nickname,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update user's premium subscription status
 */
export async function updatePremiumStatus(
  userId: string,
  isPremium: boolean
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    isPremium,
    updatedAt: serverTimestamp(),
  });
}
