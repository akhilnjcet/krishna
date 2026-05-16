import { initializeApp, getApps, getApp } from "firebase/app";
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

// Final safeguard for empty strings or 'undefined' text (Vite .env quirk)
Object.keys(firebaseConfig).forEach(key => {
  const value = firebaseConfig[key];
  if (!value || value === "undefined" || value === "null" || value.trim() === "") {
    const fallbacks = {
      apiKey: "AIzaSyA75F4OwJE3Yra7VtvyEDBlz9nehECEb6E",
      authDomain: "krishna-eng.firebaseapp.com",
      projectId: "krishna-eng",
      storageBucket: "krishna-eng.firebasestorage.app",
      messagingSenderId: "689096026190",
      appId: "1:689096026190:web:c3d5c11b1089bbcff4bb1f",
      measurementId: "G-YB254G4CE2"
    };
    firebaseConfig[key] = fallbacks[key];
  }
});

// Initialize Firebase with Singleton Pattern
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with Offline Persistence (IndexedDB)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Lazy-init Auth to prevent configuration race conditions
let authInstance = null;
export const getAuthInstance = () => {
  if (!authInstance) {
    try {
        authInstance = getAuth(app);
    } catch (e) {
        console.error("Critical Auth Init Fail:", e);
        // Direct attempt with default app as last resort
        authInstance = getAuth();
    }
  }
  return authInstance;
};

// Compatibility export
export const auth = getAuth(app);

