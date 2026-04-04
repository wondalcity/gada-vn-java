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
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type User as FirebaseUser,
} from 'firebase/auth'
import { getFirebaseAuth } from './client'

// ─── Phone OTP state (module-level singleton) ─────────────────────────────────
let _confirmationResult: ConfirmationResult | null = null
let _recaptchaVerifier: RecaptchaVerifier | null = null
let _recaptchaContainerId: string | null = null

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
  // email and public_profile are default permissions — adding them explicitly causes an error

  const result = await signInWithPopup(auth, provider)
  const idToken = await result.user.getIdToken()

  return {
    idToken,
    displayName: result.user.displayName,
    email:       result.user.email,
  }
}

/**
 * Google OAuth via Firebase popup.
 * Returns the Firebase ID Token (a valid JWT usable with /auth/verify-token).
 */
export async function signInWithGoogle(): Promise<{ idToken: string; displayName: string | null; email: string | null }> {
  const auth = getFirebaseAuth()
  const provider = new GoogleAuthProvider()
  provider.addScope('email')
  provider.addScope('profile')

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

/**
 * Step 1 of Firebase phone OTP flow.
 * Creates an invisible reCAPTCHA and triggers Firebase SMS to the given phone.
 *
 * @param phone  E.164 phone number, e.g. "+84901234567"
 * @param containerId  ID of a DOM element to attach the invisible reCAPTCHA widget
 */
export async function sendFirebaseOtp(phone: string, containerId: string): Promise<void> {
  const auth = getFirebaseAuth()

  // Reuse existing verifier only if it's for the same container.
  // If the container changed (e.g., login → Facebook phone screen), create a fresh one.
  if (!_recaptchaVerifier || _recaptchaContainerId !== containerId) {
    if (_recaptchaVerifier) {
      try { _recaptchaVerifier.clear() } catch { /* ignore */ }
      _recaptchaVerifier = null
    }
    _recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' })
    _recaptchaContainerId = containerId
  }

  try {
    _confirmationResult = await signInWithPhoneNumber(auth, phone, _recaptchaVerifier)
  } catch (err) {
    // For config/quota/phone-format errors the reCAPTCHA widget is still valid — reuse it.
    // Only reset when the widget itself is in a bad state (unexpected errors).
    const code = (err as { code?: string })?.code ?? ''
    const widgetIsOk = (
      code === 'auth/operation-not-allowed' ||
      code === 'auth/invalid-phone-number' ||
      code === 'auth/too-many-requests' ||
      code === 'auth/quota-exceeded'
    )
    if (!widgetIsOk) {
      try { _recaptchaVerifier.clear() } catch { /* ignore */ }
      _recaptchaVerifier = null
      // Replace DOM node so reCAPTCHA treats it as a fresh container
      const old = document.getElementById(containerId)
      if (old?.parentNode) {
        const fresh = document.createElement('div')
        fresh.id = containerId
        old.parentNode.replaceChild(fresh, old)
      }
    }
    throw err
  }
}

/**
 * Step 2 of Firebase phone OTP flow.
 * Confirms the OTP entered by the user and returns the Firebase ID Token.
 *
 * @param otp  6-digit code the user received via SMS
 * @returns Firebase ID Token string (ready to use as Bearer token)
 */
export async function confirmFirebaseOtp(otp: string): Promise<string> {
  if (!_confirmationResult) throw new Error('OTP not sent — call sendFirebaseOtp first')
  const credential = await _confirmationResult.confirm(otp)
  return credential.user.getIdToken()
}
