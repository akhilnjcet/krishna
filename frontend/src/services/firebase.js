import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA75F4OwJE3Yra7VtvyEDBlz9nehECEb6E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "krishna-eng.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "krishna-eng",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "krishna-eng.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "689096026190",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:689096026190:web:c3d5c11b1089bbcff4bb1f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-YB254G4CE2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with Offline Persistence (IndexedDB)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);

