/* eslint-disable no-undef */
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Get the auth instance

export { db, auth }; // Export auth
