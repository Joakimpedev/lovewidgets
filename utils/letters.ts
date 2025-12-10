/**
 * Letters Utilities for LoveWidgets
 * Handles drawing upload, letter creation, and fetching
 */

import {
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import { db, auth } from '@/config/firebaseConfig';

// ============================================
// TYPES
// ============================================

export type LetterType = 'widget' | 'affection' | 'question';

export interface Letter {
  id: string;
  senderId: string;
  receiverId: string;
  type: LetterType; // 'widget' for drawings, 'affection' for affections, 'question' for question of the day
  imageUrl?: string; // Only for widget type
  affectionType?: string; // Only for affection type (e.g., 'kiss', 'hug')
  questionId?: string; // Only for question type (date string YYYY-MM-DD)
  timestamp: Timestamp;
  isRead: boolean;
}

export interface LetterInput {
  senderId: string;
  receiverId: string;
  type: LetterType;
  imageUrl?: string; // For widget type
  affectionType?: string; // For affection type
  questionId?: string; // For question type
}

// ============================================
// IMAGE PROCESSING - Convert to base64 data URL
// ============================================

/**
 * Convert a local image to a base64 data URL
 * Stores directly in Firestore (works for small drawings)
 * Compresses image if it exceeds size limits
 * @param localUri - Local file URI from react-native-view-shot
 * @returns Base64 data URL
 */
export async function convertImageToDataUrl(
  localUri: string
): Promise<string> {
  console.log('[Letters] Converting image to data URL...');
  console.log('[Letters] Local URI:', localUri);

  try {
    // Read the file as base64
    const base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log('[Letters] Base64 length:', base64Data.length);

    // Firebase Firestore limit is ~1MB (1048487 bytes) for a single field
    // Base64 encoding increases size by ~33%, so we need to keep base64 under ~750KB
    const MAX_BASE64_SIZE = 750000; // ~750KB base64 = ~1MB when stored
    
    if (base64Data.length > MAX_BASE64_SIZE) {
      console.warn('[Letters] Image too large (', base64Data.length, 'bytes), attempting compression...');
      // If image is too large, we need to compress it further
      // For now, we'll throw an error with a helpful message
      // In the future, we could use expo-image-manipulator to resize/compress
      throw new Error(
        `Image is too large (${Math.round(base64Data.length / 1024)}KB). ` +
        `Please use a smaller background image or draw without a background. ` +
        `Maximum size is approximately 750KB.`
      );
    }

    // Create data URL (detect format from file or default to png)
    // Note: react-native-view-shot may return jpg or png depending on format used
    const dataUrl = `data:image/jpeg;base64,${base64Data}`; // Use jpeg for better compression
    console.log('[Letters] Data URL created (length:', dataUrl.length, 'bytes)');

    return dataUrl;
  } catch (error: any) {
    console.error('[Letters] Conversion failed:', error);
    throw new Error(`Image conversion failed: ${error?.message || 'Unknown error'}`);
  }
}

// ============================================
// LETTER OPERATIONS
// ============================================

/**
 * Create a new letter in Firestore
 */
export async function createLetter(input: LetterInput): Promise<string> {
  console.log('[Letters] Creating letter document...');
  console.log('[Letters] From:', input.senderId, 'To:', input.receiverId);
  console.log('[Letters] Type:', input.type);

  const letterData: any = {
    senderId: input.senderId,
    receiverId: input.receiverId,
    type: input.type,
    timestamp: serverTimestamp(),
    isRead: false,
  };

  // Add type-specific fields
  if (input.type === 'widget' && input.imageUrl) {
    letterData.imageUrl = input.imageUrl;
  } else if (input.type === 'affection' && input.affectionType) {
    letterData.affectionType = input.affectionType;
  } else if (input.type === 'question' && input.questionId) {
    letterData.questionId = input.questionId;
  }

  const docRef = await addDoc(collection(db, 'letters'), letterData);
  console.log('[Letters] Letter created with ID:', docRef.id);
  return docRef.id;
}

/**
 * Send a complete letter (convert image + create document)
 * @param localUri - Local image URI
 * @param senderId - Sender's user ID
 * @param receiverId - Receiver's (partner's) user ID
 */
export async function sendLetter(
  localUri: string,
  senderId: string,
  receiverId: string
): Promise<string> {
  console.log('[Letters] ====== SEND LETTER START ======');
  console.log('[Letters] Sender:', senderId);
  console.log('[Letters] Receiver:', receiverId);

  // 1. Convert the image to base64 data URL
  const imageUrl = await convertImageToDataUrl(localUri);

  // 2. Create the letter document (stores base64 directly in Firestore)
  const letterId = await createLetter({
    senderId,
    receiverId,
    type: 'widget',
    imageUrl,
  });

  console.log('[Letters] ====== SEND LETTER COMPLETE ======');
  return letterId;
}

/**
 * Send an affection (creates an inbox entry)
 * @param senderId - Sender's user ID
 * @param receiverId - Receiver's (partner's) user ID
 * @param affectionType - Type of affection (e.g., 'kiss', 'hug')
 */
export async function sendAffection(
  senderId: string,
  receiverId: string,
  affectionType: string
): Promise<string> {
  console.log('[Letters] ====== SEND AFFECTION START ======');
  console.log('[Letters] Sender:', senderId);
  console.log('[Letters] Receiver:', receiverId);
  console.log('[Letters] Affection:', affectionType);

  // Create the affection entry in inbox
  const letterId = await createLetter({
    senderId,
    receiverId,
    type: 'affection',
    affectionType,
  });

  console.log('[Letters] ====== SEND AFFECTION COMPLETE ======');
  return letterId;
}

/**
 * Send a question of the day notification (creates an inbox entry)
 * @param senderId - Sender's user ID
 * @param receiverId - Receiver's (partner's) user ID
 * @param questionId - Question date ID (YYYY-MM-DD)
 */
export async function sendQuestionNotification(
  senderId: string,
  receiverId: string,
  questionId: string
): Promise<string> {
  console.log('[Letters] ====== SEND QUESTION NOTIFICATION START ======');
  console.log('[Letters] Sender:', senderId);
  console.log('[Letters] Receiver:', receiverId);
  console.log('[Letters] Question ID:', questionId);

  // Create the question notification entry in inbox
  const letterId = await createLetter({
    senderId,
    receiverId,
    type: 'question',
    questionId,
  });

  console.log('[Letters] ====== SEND QUESTION NOTIFICATION COMPLETE ======');
  return letterId;
}

// ============================================
// LETTER FETCHING
// ============================================

/**
 * Subscribe to all letters for a user (sent and received)
 * Uses two separate queries to avoid complex index requirements
 * @param userId - Current user's ID
 * @param callback - Called when letters update
 * @returns Unsubscribe function
 */
export function subscribeToLetters(
  userId: string,
  partnerId: string | null,
  callback: (letters: Letter[]) => void
): () => void {
  // If no partner, return empty array
  if (!partnerId) {
    console.log('[Letters] No partner, returning empty');
    callback([]);
    return () => {};
  }

  console.log('[Letters] Subscribing to letters for user:', userId, 'partner:', partnerId);

  const lettersRef = collection(db, 'letters');
  let sentLetters: Letter[] = [];
  let receivedLetters: Letter[] = [];

  // Query 1: Letters I sent to my partner (no orderBy to avoid index requirement)
  const sentQuery = query(
    lettersRef,
    where('senderId', '==', userId),
    where('receiverId', '==', partnerId)
  );

  // Query 2: Letters my partner sent to me (no orderBy to avoid index requirement)
  const receivedQuery = query(
    lettersRef,
    where('senderId', '==', partnerId),
    where('receiverId', '==', userId)
  );

  function mergeAndCallback() {
    // Merge and sort by timestamp (oldest first, newest at bottom like chat)
    const allLetters = [...sentLetters, ...receivedLetters].sort((a, b) => {
      const timeA = a.timestamp?.toMillis?.() || 0;
      const timeB = b.timestamp?.toMillis?.() || 0;
      return timeA - timeB; // Ascending order (oldest first)
    });
    console.log('[Letters] Total letters:', allLetters.length, '(sent:', sentLetters.length, ', received:', receivedLetters.length, ')');
    callback(allLetters);
  }

  // Subscribe to sent letters
  const unsubSent = onSnapshot(
    sentQuery,
    (snapshot) => {
      sentLetters = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          type: (data.type || 'widget') as LetterType, // Default to 'widget' for backwards compatibility
          imageUrl: data.imageUrl,
          affectionType: data.affectionType,
          questionId: data.questionId,
          timestamp: data.timestamp,
          isRead: data.isRead ?? true,
        };
      });
      console.log('[Letters] Sent letters updated:', sentLetters.length);
      mergeAndCallback();
    },
    (error) => {
      console.error('[Letters] Sent query error:', error.message);
      // Don't fail completely, just use what we have
      mergeAndCallback();
    }
  );

  // Subscribe to received letters
  const unsubReceived = onSnapshot(
    receivedQuery,
    (snapshot) => {
      receivedLetters = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          type: (data.type || 'widget') as LetterType, // Default to 'widget' for backwards compatibility
          imageUrl: data.imageUrl,
          affectionType: data.affectionType,
          questionId: data.questionId,
          timestamp: data.timestamp,
          isRead: data.isRead ?? true,
        };
      });
      console.log('[Letters] Received letters updated:', receivedLetters.length);
      mergeAndCallback();
    },
    (error) => {
      console.error('[Letters] Received query error:', error.message);
      // Don't fail completely, just use what we have
      mergeAndCallback();
    }
  );

  // Return combined unsubscribe function
  return () => {
    unsubSent();
    unsubReceived();
  };
}

/**
 * Get the latest letter received by a user
 * @param userId - User's ID (receiver)
 * @returns The latest letter or null
 */
export async function getLatestReceivedLetter(
  userId: string
): Promise<Letter | null> {
  const lettersRef = collection(db, 'letters');
  const q = query(
    lettersRef,
    where('receiverId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    senderId: data.senderId,
    receiverId: data.receiverId,
    type: (data.type || 'widget') as LetterType,
    imageUrl: data.imageUrl,
    affectionType: data.affectionType,
    questionId: data.questionId,
    timestamp: data.timestamp,
    isRead: data.isRead ?? true,
  };
}

/**
 * Subscribe to the latest received letter (real-time)
 */
export function subscribeToLatestReceivedLetter(
  userId: string,
  callback: (letter: Letter | null) => void
): () => void {
  const lettersRef = collection(db, 'letters');
  const q = query(
    lettersRef,
    where('receiverId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(1)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();

      callback({
        id: doc.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        type: (data.type || 'widget') as LetterType,
        imageUrl: data.imageUrl,
        affectionType: data.affectionType,
        timestamp: data.timestamp,
        isRead: data.isRead ?? true,
      });
    },
    (error) => {
      console.error('[Letters] Latest letter subscription error:', error);
      callback(null);
    }
  );

  return unsubscribe;
}

/**
 * Format a Firestore timestamp for display
 */
export function formatLetterDate(timestamp: Timestamp | null): string {
  if (!timestamp) return '';

  try {
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch {
    return '';
  }
}
