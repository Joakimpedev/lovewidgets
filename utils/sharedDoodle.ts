/**
 * Shared Doodle Utilities
 * Handles real-time collaborative drawing synchronization
 */

import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  deleteDoc,
  writeBatch,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';

// ============================================
// TYPES
// ============================================

export interface DoodlePath {
  id: string;
  userId: string;
  path: string; // SVG path string
  color: string;
  strokeWidth: number;
  glow?: boolean; // Whether this path has glow effect
  timestamp: Timestamp;
}

export interface DoodleBackground {
  imageUrl: string;
  scale: number; // Zoom level (1.0 = original size)
  translateX: number; // Pan X offset
  translateY: number; // Pan Y offset
  updatedBy: string; // User ID who last updated
  updatedAt: Timestamp;
}

export interface DoodleClock {
  id: string;
  style: 'classic' | 'modern' | 'minimal' | 'digital';
  x: number; // Position X (0-1 as percentage of canvas width)
  y: number; // Position Y (0-1 as percentage of canvas height)
  size: number; // Size in pixels
  font?: string; // Font family name
  bold?: boolean; // Bold weight
  color?: string; // Text color
  updatedBy: string;
  updatedAt: Timestamp;
}

// ============================================
// CONNECTION ID (Same pattern as garden)
// ============================================

/**
 * Generate a deterministic connection ID for shared doodles
 * Same logic as garden - ensures both users access the same document
 */
export function getDoodleConnectionId(userId: string, partnerId: string): string {
  const [user1Id, user2Id] = [userId, partnerId].sort();
  return `doodle_${user1Id}_${user2Id}`;
}

// ============================================
// REAL-TIME SYNC
// ============================================

/**
 * Subscribe to shared doodle paths
 * Receives real-time updates when partner draws
 */
export function subscribeToSharedDoodle(
  userId: string,
  partnerId: string,
  callback: (paths: DoodlePath[]) => void
): () => void {
  const connectionId = getDoodleConnectionId(userId, partnerId);
  const pathsRef = collection(db, 'sharedDoodles', connectionId, 'paths');

  console.log('[SharedDoodle] 👀 Subscribing to shared doodle:', connectionId);

  const q = query(
    pathsRef,
    orderBy('timestamp', 'asc') // Oldest first, so paths appear in drawing order
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const paths: DoodlePath[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          path: data.path,
          color: data.color,
          strokeWidth: data.strokeWidth,
          glow: data.glow || false, // Default to false for backward compatibility
          timestamp: data.timestamp,
        };
      });
      console.log('[SharedDoodle] Paths updated:', paths.length);
      callback(paths);
    },
    (error) => {
      console.error('[SharedDoodle] Subscription error:', error);
    }
  );
}

/**
 * Subscribe to shared doodle background
 */
export function subscribeToDoodleBackground(
  userId: string,
  partnerId: string,
  callback: (background: DoodleBackground | null) => void
): () => void {
  const connectionId = getDoodleConnectionId(userId, partnerId);
  const backgroundRef = doc(db, 'sharedDoodles', connectionId, 'meta', 'background');

  return onSnapshot(
    backgroundRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          imageUrl: data.imageUrl,
          scale: data.scale || 1.0,
          translateX: data.translateX || 0,
          translateY: data.translateY || 0,
          updatedBy: data.updatedBy,
          updatedAt: data.updatedAt,
        });
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('[SharedDoodle] Background subscription error:', error);
      callback(null);
    }
  );
}

/**
 * Subscribe to shared doodle clocks
 */
export function subscribeToDoodleClocks(
  userId: string,
  partnerId: string,
  callback: (clocks: DoodleClock[]) => void
): () => void {
  const connectionId = getDoodleConnectionId(userId, partnerId);
  const clocksRef = collection(db, 'sharedDoodles', connectionId, 'clocks');

  const q = query(clocksRef, orderBy('updatedAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const clocks: DoodleClock[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          style: data.style || 'classic',
          x: data.x || 0.5,
          y: data.y || 0.5,
          size: data.size || 100,
          font: data.font,
          bold: data.bold || false,
          color: data.color,
          updatedBy: data.updatedBy,
          updatedAt: data.updatedAt,
        };
      });
      callback(clocks);
    },
    (error) => {
      console.error('[SharedDoodle] Clocks subscription error:', error);
      callback([]);
    }
  );
}

// ============================================
// DRAWING OPERATIONS
// ============================================

/**
 * Add a new drawing path to the shared doodle
 * This will trigger real-time updates for the partner
 */
export async function addDoodlePath(
  userId: string,
  partnerId: string,
  path: string,
  color: string,
  strokeWidth: number,
  glow?: boolean
): Promise<string> {
  const connectionId = getDoodleConnectionId(userId, partnerId);
  const pathsRef = collection(db, 'sharedDoodles', connectionId, 'paths');

  const pathData: any = {
    userId,
    path,
    color,
    strokeWidth,
    timestamp: serverTimestamp(),
  };

  if (glow) {
    pathData.glow = true;
  }

  const docRef = await addDoc(pathsRef, pathData);
  console.log('[SharedDoodle] ✅ Path added:', docRef.id);
  return docRef.id;
}

/**
 * Clear all paths from the shared doodle
 * Both users will see the canvas cleared
 */
export async function clearSharedDoodle(
  userId: string,
  partnerId: string
): Promise<void> {
  const connectionId = getDoodleConnectionId(userId, partnerId);
  const pathsRef = collection(db, 'sharedDoodles', connectionId, 'paths');

  // Get all paths
  const snapshot = await getDocs(pathsRef);

  // Delete in batches (Firestore limit is 500 operations per batch)
  const batch = writeBatch(db);
  let count = 0;

  snapshot.docs.forEach((docSnap) => {
    if (count < 500) {
      batch.delete(docSnap.ref);
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log('[SharedDoodle] ✅ Cleared', count, 'paths');
  }

  // If there are more than 500 paths, delete the rest
  if (snapshot.docs.length > 500) {
    const remainingSnapshot = await getDocs(pathsRef);
    const remainingBatch = writeBatch(db);
    remainingSnapshot.docs.forEach((docSnap) => {
      remainingBatch.delete(docSnap.ref);
    });
    await remainingBatch.commit();
  }
}

/**
 * Undo the last path (remove most recent)
 */
export async function undoLastPath(
  userId: string,
  partnerId: string
): Promise<void> {
  const connectionId = getDoodleConnectionId(userId, partnerId);
  const pathsRef = collection(db, 'sharedDoodles', connectionId, 'paths');

  // Get the most recent path
  const q = query(pathsRef, orderBy('timestamp', 'desc'), limit(1));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const lastPath = snapshot.docs[0];
    await deleteDoc(lastPath.ref);
    console.log('[SharedDoodle] ✅ Undid last path');
  }
}

/**
 * Update background image and position
 */
export async function updateDoodleBackground(
  userId: string,
  partnerId: string,
  imageUrl: string,
  scale: number,
  translateX: number,
  translateY: number
): Promise<void> {
  const connectionId = getDoodleConnectionId(userId, partnerId);
  const backgroundRef = doc(db, 'sharedDoodles', connectionId, 'meta', 'background');

  await setDoc(backgroundRef, {
    imageUrl,
    scale,
    translateX,
    translateY,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  });
  console.log('[SharedDoodle] ✅ Background updated');
}

/**
 * Remove background image
 */
export async function removeDoodleBackground(
  userId: string,
  partnerId: string
): Promise<void> {
  const connectionId = getDoodleConnectionId(userId, partnerId);
  const backgroundRef = doc(db, 'sharedDoodles', connectionId, 'meta', 'background');
  await deleteDoc(backgroundRef);
  console.log('[SharedDoodle] ✅ Background removed');
}

/**
 * Add a new clock
 */
export async function addDoodleClock(
  userId: string,
  partnerId: string,
  style: 'classic' | 'modern' | 'minimal' | 'digital',
  x: number,
  y: number,
  size: number,
  font?: string,
  bold?: boolean,
  color?: string
): Promise<string> {
  const connectionId = getDoodleConnectionId(userId, partnerId);
  const clocksRef = collection(db, 'sharedDoodles', connectionId, 'clocks');

  const clockData: any = {
    style,
    x,
    y,
    size,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  };

  if (font) clockData.font = font;
  if (bold !== undefined) clockData.bold = bold;
  if (color) clockData.color = color;

  const docRef = await addDoc(clocksRef, clockData);
  console.log('[SharedDoodle] ✅ Clock added:', docRef.id);
  return docRef.id;
}

/**
 * Update clock position and size
 */
export async function updateDoodleClock(
  userId: string,
  partnerId: string,
  clockId: string,
  x: number,
  y: number,
  size?: number
): Promise<void> {
  const connectionId = getDoodleConnectionId(userId, partnerId);
  const clockRef = doc(db, 'sharedDoodles', connectionId, 'clocks', clockId);

  const updateData: any = {
    x,
    y,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  };

  if (size !== undefined) {
    updateData.size = size;
  }

  await updateDoc(clockRef, updateData);
}

/**
 * Delete a clock
 */
export async function deleteDoodleClock(
  userId: string,
  partnerId: string,
  clockId: string
): Promise<void> {
  const connectionId = getDoodleConnectionId(userId, partnerId);
  const clockRef = doc(db, 'sharedDoodles', connectionId, 'clocks', clockId);
  await deleteDoc(clockRef);
  console.log('[SharedDoodle] ✅ Clock deleted');
}

