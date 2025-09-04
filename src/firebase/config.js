/* eslint-disable no-undef */
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";

// --- IMPORTANT: Firebase Configuration ---
// Replace this with your own Firebase project's configuration.
const firebaseConfig = {
  apiKey: "AIzaSyAlw7wM2vl-x2m8zZ32AxspDqweNHJ9xyc",
  authDomain: "meem-quiz.firebaseapp.com",
  projectId: "meem-quiz",
  storageBucket: "meem-quiz.firebasestorage.app",
  messagingSenderId: "267888426373",
  appId: "1:267888426373:web:2a92fafb01c24eca77d8ec",
  measurementId: "G-ZER23HG01F",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Get the auth instance

export { db, auth }; // Export auth
