import { initializeApp } from 'firebase/app';
// @ts-ignore
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --------------------------------------------------------
// PASTE YOUR REAL KEYS FROM FIREBASE CONSOLE BELOW
// --------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBStmjXb8WwCpBboBtLlo3WGzYuA14kjJg", 
  authDomain: "lovewidgets-41a33.firebaseapp.com",
  projectId: "lovewidgets-41a33",
  storageBucket: "lovewidgets-41a33.firebasestorage.app",
  messagingSenderId: "843832822074",
  appId: "1:843832822074:web:3d80353773ba2fe21a2803",
  // measurementId is optional and not needed for now
};

// 1. Initialize the App
const app = initializeApp(firebaseConfig);

// 2. Initialize Auth with Persistence (Keeps users logged in on mobile)
const auth = initializeAuth(app, {
  // @ts-ignore
  persistence: getReactNativePersistence(AsyncStorage)
});

// 3. Initialize Database
const db = getFirestore(app);

// 4. Initialize Storage (The Locker for Images)
const storage = getStorage(app);

export { app, auth, db, storage };

