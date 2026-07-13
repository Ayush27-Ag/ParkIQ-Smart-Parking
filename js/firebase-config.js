// 🔥 Firebase SDK Imports
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// 🔐 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBDvt-g77AqHtuGHXyBEGrFtoLMIw56zOU",
  authDomain: "parkiq-39efc.firebaseapp.com",
  projectId: "parkiq-39efc",
  storageBucket: "parkiq-39efc.firebasestorage.app",
  messagingSenderId: "788308320270",
  appId: "1:788308320270:web:a53ea15b99413c21709c5f"
};

// 🚀 SAFE INITIALIZATION (important for multi-page apps)
const app = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApps()[0];

// 🔐 Auth
const auth = getAuth(app);

// 🔥 Firestore
const db = getFirestore(app);

// ✅ Export
export { app, auth, db };