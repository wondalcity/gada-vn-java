/**
 * Client-side session management.
 *
 * Stores the Firebase ID Token as a cookie named 'gada_session'.
 * The cookie is:
 * - NOT httpOnly — required for Capacitor WebView to access it
 * - SameSite=Strict — prevents CSRF
 * - Secure on HTTPS — required in production
 * - max-age=2592000 — 30 days when rememberMe=true; session cookie otherwise
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

/** localStorage key that stores the user's "keep me logged in" preference. */
export const REMEMBER_ME_KEY = 'gada_remember_me'

/** Persist the user's "자동 로그인" preference to localStorage. */
export function setRememberMe(value: boolean): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(REMEMBER_ME_KEY, value ? '1' : '0')
  }
}

/**
 * Read the stored "자동 로그인" preference.
 * Defaults to true (persistent) when not set.
 */
export function getRememberMe(): boolean {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(REMEMBER_ME_KEY) !== '0'
}

/**
 * Store the Firebase ID Token as the session cookie.
 * rememberMe=true (default): 30-day persistent cookie
 * rememberMe=false: session cookie — cleared when browser closes
 */
export function setSessionCookie(idToken: string, rememberMe = true): void {
  const isSecure = typeof window !== 'undefined' && location.protocol === 'https:'
  const parts = [`${SESSION_COOKIE}=${idToken}`, 'path=/', 'SameSite=Strict']
  if (rememberMe) parts.push('max-age=2592000')
  if (isSecure) parts.push('Secure')
  document.cookie = parts.join('; ')
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
