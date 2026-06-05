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
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
