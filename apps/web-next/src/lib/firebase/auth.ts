/**
 * Firebase auth operation wrappers.
 *
 * These functions abstract the Firebase SDK calls and handle:
 * - signInWithCustomToken (used by phone OTP + email/password flows)
 * - signInWithPopup with FacebookAuthProvider
 * - signOut
 * - onIdTokenChanged listener for automatic token refresh
 *
 * All functions return the Firebase ID Token string, which is
 * stored as the gada_session cookie for API authorization.
 */

import {
  signInWithCustomToken,
  signInWithPopup,
  FacebookAuthProvider,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  type User as FirebaseUser,
} from 'firebase/auth'
import { getFirebaseAuth } from './client'

/**
 * Exchange a Firebase custom token (from our Laravel backend) for a
 * Firebase ID Token. Used by the phone OTP and email/password flows.
 *
 * @returns Firebase ID Token string (used as Bearer token for API calls)
 */
export async function signInWithCustomTokenAndGetIdToken(customToken: string): Promise<string> {
  const auth = getFirebaseAuth()
  const credential = await signInWithCustomToken(auth, customToken)
  return credential.user.getIdToken()
}

/**
 * Facebook OAuth via Firebase popup.
 * Returns both the Firebase ID Token and the user's display info.
 *
 * Used by: POST /auth/social/facebook
 * The returned idToken is both sent to the backend (for user upsert)
 * AND stored as gada_session (since it's already a valid Firebase ID Token).
 */
export async function signInWithFacebook(): Promise<{ idToken: string; displayName: string | null; email: string | null }> {
  const auth = getFirebaseAuth()
  const provider = new FacebookAuthProvider()
  provider.addScope('email')
  provider.addScope('public_profile')

  const result = await signInWithPopup(auth, provider)
  const idToken = await result.user.getIdToken()

  return {
    idToken,
    displayName: result.user.displayName,
    email:       result.user.email,
  }
}

/**
 * Sign out of Firebase.
 * Called alongside API POST /auth/logout (which revokes refresh tokens server-side).
 */
export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth()
  await firebaseSignOut(auth)
}

/**
 * Subscribe to Firebase ID Token changes (auto-refresh every ~1 hour).
 * Updates the gada_session cookie whenever Firebase refreshes the token.
 *
 * Call this once on app init (e.g., in a root client layout).
 * Returns an unsubscribe function.
 */
export function subscribeToTokenRefresh(
  onToken: (token: string | null) => void,
): () => void {
  const auth = getFirebaseAuth()
  return onIdTokenChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      const token = await user.getIdToken()
      onToken(token)
    } else {
      onToken(null)
    }
  })
}
