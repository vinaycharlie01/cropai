
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// These variables are loaded from the .env.local file
const firebaseConfig = {
  apiKey: "AIzaSyBSGKsRBFnyn5MBx040AsRY75E7Enxdxcw",
  authDomain: "kisan-rakshak-slne1.firebaseapp.com",
  projectId: "kisan-rakshak-slne1",
  storageBucket: "kisan-rakshak-slne1.firebasestorage.app",
  messagingSenderId: "269709287171",
  appId: "1:269709287171:web:7e1bfcf8e86519f1749336"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
