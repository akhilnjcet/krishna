import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Replace with your real Firebase config here!
const firebaseConfig = {
  apiKey: "AIzaSyDummyKey-For-UI-Preview",
  authDomain: "krishna-eng.firebaseapp.com",
  projectId: "krishna-eng",
  storageBucket: "krishna-eng.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef12345"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
