/**
 * Firebase Web SDK initialization for the GADA VN web/mobile app.
 *
 * This file is imported by client components only.
 * All Firebase config values come from NEXT_PUBLIC_ env vars so they
 * are safe to expose in the browser (Firebase project is public-facing).
 *
 * Security note: Firebase security rules (Firestore/Storage) and
 * Firebase Auth token verification (server-side via Admin SDK) are the
 * real security boundary — these client config values being "public" is
 * expected and safe per Firebase docs.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

// Singleton pattern — Firebase SDK throws if initialized multiple times
let app: FirebaseApp
let auth: Auth

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApps()[0]
  }
  return app
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp())
  }
  return auth
}
