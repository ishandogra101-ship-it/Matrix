/* ── firebase ── the ONLY module that imports from the Firebase CDN.
   All sub-packages share the same pinned version (10.12.0). Config is
   injected as window.FIREBASE_CONFIG by firebase-config.js (a classic
   <script> loaded before the module graph). ── */
import { initializeApp }                        from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut,
         signInWithEmailAndPassword, createUserWithEmailAndPassword,
         sendPasswordResetEmail }               from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot,
         setDoc, updateDoc, deleteDoc, getDoc, getDocs, writeBatch, addDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

/* true once real credentials have been filled into firebase-config.js */
export const configured = !!(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY');

const app  = configured ? initializeApp(window.FIREBASE_CONFIG) : null;
export const auth = app ? getAuth(app) : null;
export const db   = app ? getFirestore(app) : null;

export {
  onAuthStateChanged, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, getDocs, writeBatch, addDoc,
};
