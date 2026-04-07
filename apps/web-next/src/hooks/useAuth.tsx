/**
 * useAuth — client-side auth state hook.
 *
 * Manages the current user's auth state including:
 * - Firebase auth state (logged in / logged out)
 * - Current Firebase ID Token (refreshed automatically)
 * - User profile loaded from GET /me
 * - Login helpers (OTP, email/password, Facebook)
 * - Logout
 *
 * Usage:
 *   const { user, isLoading, sendOtp, verifyOtp, loginEmail, loginFacebook, logout } = useAuth()
 */

'use client'

import * as React from 'react'
import { useRouter } from '@/i18n/navigation'
import {
  signInWithCustomTokenAndGetIdToken,
  signInWithFacebook,
  signOutFirebase,
  subscribeToTokenRefresh,
} from '../lib/firebase/auth'
import { setSessionCookie, clearSessionCookie, getSessionCookie } from '../lib/auth/session'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  firebaseUid: string
  name: string
  phone?: string
  email?: string
  locale: 'ko' | 'vi' | 'en'
  status: string
  isWorker: boolean
  isManager: boolean
  isAdmin: boolean
  managerStatus: string | null
  roles: Array<{ role: string; status: string; grantedAt: string }>
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  idToken: string | null
}

// ─── API helpers ────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })
  const body = await res.json()
  if (!res.ok) throw Object.assign(new Error(body.message ?? 'API error'), { status: res.status, errors: body.errors })
  return body
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = React.createContext<ReturnType<typeof useAuthProvider> | null>(null)

function useAuthProvider(locale: string) {
  const router = useRouter()
  const [state, setState] = React.useState<AuthState>({
    user: null,
    isLoading: true,
    idToken: null,
  })

  // Load user on mount if session cookie exists
  React.useEffect(() => {
    const token = getSessionCookie()
    if (!token) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }
    // Load user profile
    apiFetch<{ statusCode: number; data: AuthUser }>('/auth/me', { token })
      .then(({ data }) => setState({ user: data, idToken: token, isLoading: false }))
      .catch(() => {
        // Token invalid/expired — clear session
        clearSessionCookie()
        setState({ user: null, idToken: null, isLoading: false })
      })
  }, [])

  // Subscribe to Firebase token refresh — keeps cookie in sync
  React.useEffect(() => {
    const unsubscribe = subscribeToTokenRefresh((newToken) => {
      if (newToken) {
        setSessionCookie(newToken)
        setState((s) => ({ ...s, idToken: newToken }))
      } else {
        // devToken (dev_* prefix) is not a Firebase token — Firebase has no
        // knowledge of it, so onIdTokenChanged always fires null for dev users.
        // Only clear the session when it is not a dev-mode token.
        const current = getSessionCookie()
        if (current?.startsWith('dev')) return
        clearSessionCookie()
        setState({ user: null, idToken: null, isLoading: false })
      }
    })
    return unsubscribe
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * After getting an ID Token, load the user profile and set session.
   * Handles the isNewUser redirect.
   */
  async function finalizeLogin(idToken: string, isNewUser: boolean, redirectTo?: string): Promise<void> {
    setSessionCookie(idToken)

    // Load full user profile from /me
    const { data: user } = await apiFetch<{ statusCode: number; data: AuthUser }>('/auth/me', { token: idToken })
    setState({ user, idToken, isLoading: false })

    if (isNewUser) {
      router.push(`/${locale}/register`)
    } else {
      router.push((redirectTo ?? `/${locale}/worker`) as any)
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Step 1 of phone OTP flow: send OTP to phone number. */
  async function sendOtp(phone: string): Promise<void> {
    await apiFetch('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    })
  }

  /**
   * Step 2 of phone OTP flow: verify OTP → session token.
   * Dev: backend returns devToken directly.
   * Prod: backend returns Firebase customToken → exchange for ID Token.
   */
  async function verifyOtp(phone: string, otp: string, redirectTo?: string): Promise<boolean> {
    const { data } = await apiFetch<{ statusCode: number; data: { customToken?: string; devToken?: string; isNewUser: boolean } }>(
      '/auth/otp/verify',
      { method: 'POST', body: JSON.stringify({ phone, otp }) },
    )

    let sessionToken: string
    if (data.devToken) {
      // Dev mode: use devToken directly as session (Bearer dev_* accepted by API guard)
      sessionToken = data.devToken
    } else if (data.customToken) {
      sessionToken = await signInWithCustomTokenAndGetIdToken(data.customToken)
    } else {
      throw new Error('No token returned from server')
    }

    await finalizeLogin(sessionToken, data.isNewUser, redirectTo)
    return data.isNewUser
  }

  /**
   * Email + password login.
   * Dev: backend returns devToken. Prod: Firebase custom token.
   */
  async function loginEmail(email: string, password: string, redirectTo?: string): Promise<void> {
    const { data } = await apiFetch<{ statusCode: number; data: { customToken?: string; devToken?: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    )

    let sessionToken: string
    if (data.devToken) {
      sessionToken = data.devToken
    } else if (data.customToken) {
      sessionToken = await signInWithCustomTokenAndGetIdToken(data.customToken)
    } else {
      throw new Error('No token returned from server')
    }

    await finalizeLogin(sessionToken, false, redirectTo)
  }

  /**
   * Facebook OAuth via Firebase popup.
   * The Firebase ID Token is sent to the backend for user upsert.
   */
  async function loginFacebook(redirectTo?: string): Promise<void> {
    const { idToken } = await signInWithFacebook()

    // Backend upserts user, returns isNewUser flag
    const { data } = await apiFetch<{ statusCode: number; data: { isNewUser: boolean } }>(
      '/auth/social/facebook',
      { method: 'POST', body: JSON.stringify({ idToken }) },
    )

    // The idToken from Facebook Firebase auth is already a valid Firebase ID Token
    await finalizeLogin(idToken, data.isNewUser, redirectTo)
  }

  /** Complete profile after first OTP login. Called from /register page. */
  async function register(
    name: string,
    email?: string,
    password?: string,
  ): Promise<AuthUser> {
    if (!state.idToken) throw new Error('Not authenticated')

    const { data: user } = await apiFetch<{ statusCode: number; data: AuthUser }>(
      '/auth/register',
      {
        method: 'POST',
        token: state.idToken,
        body: JSON.stringify({ name, email, password }),
      },
    )

    setState((s) => ({ ...s, user }))
    return user
  }

  /** Sign out — revokes Firebase tokens server-side and clears local session. */
  async function logout(): Promise<void> {
    if (state.idToken) {
      // Best-effort server revocation
      apiFetch('/auth/logout', {
        method: 'POST',
        token: state.idToken,
      }).catch(() => { /* ignore — local logout proceeds regardless */ })
    }
    await signOutFirebase()
    clearSessionCookie()
    setState({ user: null, idToken: null, isLoading: false })
    router.push(`/${locale}/login`)
  }

  return {
    user:      state.user,
    isLoading: state.isLoading,
    idToken:   state.idToken,
    isLoggedIn: state.user !== null,
    sendOtp,
    verifyOtp,
    loginEmail,
    loginFacebook,
    register,
    logout,
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children, locale }: { children: React.ReactNode; locale: string }) {
  const auth = useAuthProvider(locale)
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
