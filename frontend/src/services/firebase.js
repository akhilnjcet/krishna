import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Replace with your real Firebase config here!
const firebaseConfig = {
  apiKey: "AIzaSyA75F4OwJE3Yra7VtvyEDBlz9nehECEb6E",
  authDomain: "krishna-eng.firebaseapp.com",
  projectId: "krishna-eng",
  storageBucket: "krishna-eng.firebasestorage.app",
  messagingSenderId: "689096026190",
  appId: "1:689096026190:web:c3d5c11b1089bbcff4bb1f",
  measurementId: "G-YB254G4CE2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
