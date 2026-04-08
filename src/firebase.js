// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithPopup
} from "firebase/auth";


import { getFunctions } from "firebase/functions"; // 1. Add this import

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,     // Added this
  writeBatch,    // Added this
  onSnapshot,
  updateDoc,
  serverTimestamp,
  limit
} from "firebase/firestore";

// 💡 NEW: Import Storage
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // 💡 Initialize Storage
const googleProvider = new GoogleAuthProvider();

export {
  app,
  auth,
  db,
  storage, // 💡 Export storage
  googleProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  sendPasswordResetEmail,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,     // Added this
  writeBatch,    // Added this
  orderBy,
  onSnapshot,
  updateProfile,
  updateDoc,
  limit,
  serverTimestamp,
};
export const functions = getFunctions(app,"us-central1"); // 3. Ensure this line exists!