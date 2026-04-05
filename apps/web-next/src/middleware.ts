import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const handleI18nRouting = createMiddleware(routing)

// Routes that require authentication
const AUTH_REQUIRED_PREFIXES = ['/worker', '/manager']
// Routes accessible only when NOT authenticated
const GUEST_ONLY_PREFIXES = ['/login', '/register']

/** Build an absolute redirect URL using the public-facing host from nginx headers.
 *  This avoids 0.0.0.0 appearing in redirects when running behind a reverse proxy.
 */
function publicUrl(path: string, request: NextRequest): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (host) {
    return new URL(path, `${proto}://${host}`)
  }
  // Fallback: clone nextUrl and replace just the pathname+search
  const url = request.nextUrl.clone()
  url.pathname = path
  url.search = ''
  return url
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Strip locale prefix for logic checks
  const pathnameWithoutLocale = pathname.replace(/^\/(ko|vi|en)/, '') || '/'

  // Check auth token in cookie (set by client after Firebase login)
  const hasSession = request.cookies.has('gada_session')

  // Redirect authenticated users away from guest-only pages
  if (hasSession && GUEST_ONLY_PREFIXES.some((p) => pathnameWithoutLocale.startsWith(p))) {
    const locale = pathname.split('/')[1] || 'ko'
    return NextResponse.redirect(publicUrl(`/${locale}/worker`, request))
  }

  // Redirect unauthenticated users away from protected pages
  if (!hasSession && AUTH_REQUIRED_PREFIXES.some((p) => pathnameWithoutLocale.startsWith(p))) {
    const locale = pathname.split('/')[1] || 'ko'
    const loginUrl = publicUrl(`/${locale}/login`, request)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return handleI18nRouting(request)
}

export const config = {
  matcher: [
    // Match all pathnames except Next.js internals, API routes, and static assets
    '/((?!_next|_vercel|api|.*\\..*).*)',
  ],
}
