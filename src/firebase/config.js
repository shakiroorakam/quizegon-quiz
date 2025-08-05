/* global __firebase_config */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- IMPORTANT: Firebase Configuration ---
// Replace this with your own Firebase project's configuration.
const firebaseConfig = {
    apiKey: "AIzaSyCET3Rl8vtx27BsQ2XlCYuwa_WDMUePWRs",
  authDomain: "quizegon-quiz.firebaseapp.com",
  projectId: "quizegon-quiz",
  storageBucket: "quizegon-quiz.firebasestorage.app",
  messagingSenderId: "507992802221",
  appId: "1:507992802221:web:e6ace6233b3df38d6e9724"
};

// Use global variables if provided, otherwise use the placeholder config.
const finalFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig;

// Initialize Firebase
const app = initializeApp(finalFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Set auth persistence if needed, for example:
// import { browserLocalPersistence, setPersistence } from 'firebase/auth';
// setPersistence(auth, browserLocalPersistence);

export { auth, db };
