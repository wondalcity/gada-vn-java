/**
 * Client-side session management.
 *
 * Stores the Firebase ID Token as a cookie named 'gada_session'.
 * The cookie is:
 * - NOT httpOnly — required for Capacitor WebView to access it
 * - SameSite=Strict — prevents CSRF
 * - Secure on HTTPS — required in production
 * - max-age=604800 — 7 days (cookie outlives the 1h Firebase token; useAuth
 *   refreshes the cookie on every token refresh via subscribeToTokenRefresh)
 *
 * Why not httpOnly?
 * The Capacitor bridge (session-bridge.ts in mobile-shell) needs to
 * read the token from Preferences and set it as a cookie. HttpOnly
 * cookies cannot be set or read by JavaScript.
 *
 * Security tradeoff: We accept XSS risk mitigation via CSP headers
 * and rely on Firebase token short-lived nature (1hr TTL).
 */

/** Cookie name used by Next.js middleware and getAuthUser() */
export const SESSION_COOKIE = 'gada_session'

/**
 * Store the Firebase ID Token as the session cookie.
 * Called after successful login (OTP verify, email/password, Facebook).
 */
export function setSessionCookie(idToken: string): void {
  const secure = typeof window !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${SESSION_COOKIE}=${idToken}; path=/; max-age=604800; SameSite=Strict${secure}`
}

/**
 * Read the session cookie value (Firebase ID Token).
 * Returns null if not set.
 */
export function getSessionCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SESSION_COOKIE}=`))
  return match ? match.split('=')[1] : null
}

/**
 * Clear the session cookie.
 * Called on logout.
 */
export function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Strict`
}

/**
 * Locale preference key for localStorage.
 */
export const LOCALE_KEY = 'gada_locale'

export function getStoredLocale(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(LOCALE_KEY)
}

export function setStoredLocale(locale: string): void {
  localStorage.setItem(LOCALE_KEY, locale)
}
