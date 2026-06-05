/**
 * Firebase Configuration
 * ─────────────────────
 * 1. Go to https://firebase.google.com and sign in
 * 2. Create a new project (or open an existing one)
 * 3. Click "Add app" → Web (</>) → register the app
 * 4. Copy the firebaseConfig values below from "SDK setup and configuration"
 * 5. In Firebase console → Build → Authentication → Get started → Email/Password → Enable
 * 6. In Firebase console → Build → Firestore Database → Create database (start in production mode)
 *    Then add a Security Rule allowing read/write only to authenticated users:
 *
 *    rules_version = '2';
 *    service cloud.firestore {
 *      match /databases/{database}/documents {
 *        match /users/{userId}/{document=**} {
 *          allow read, write: if request.auth != null && request.auth.uid == userId;
 *        }
 *      }
 *    }
 */
window.FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBsIu6akHr6aRwB4lttpXeBXCKTGOw9Vo4",
  authDomain:        "matrix-feb00.firebaseapp.com",
  projectId:         "matrix-feb00",
  storageBucket:     "matrix-feb00.firebasestorage.app",
  messagingSenderId: "804534871012",
  appId:             "1:804534871012:web:5dcd7375d3dd6e88a61df1"
};
