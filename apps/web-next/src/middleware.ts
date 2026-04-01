import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const handleI18nRouting = createMiddleware(routing)

// Routes that require authentication
const AUTH_REQUIRED_PREFIXES = ['/worker', '/manager']
// Routes accessible only when NOT authenticated
const GUEST_ONLY_PREFIXES = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Strip locale prefix for logic checks
  const pathnameWithoutLocale = pathname.replace(/^\/(ko|vi|en)/, '') || '/'

  // Check auth token in cookie (set by client after Firebase login)
  const hasSession = request.cookies.has('gada_session')

  // Redirect authenticated users away from guest-only pages
  if (hasSession && GUEST_ONLY_PREFIXES.some((p) => pathnameWithoutLocale.startsWith(p))) {
    const locale = pathname.split('/')[1] || 'ko'
    return NextResponse.redirect(new URL(`/${locale}/worker`, request.url))
  }

  // Redirect unauthenticated users away from protected pages
  if (!hasSession && AUTH_REQUIRED_PREFIXES.some((p) => pathnameWithoutLocale.startsWith(p))) {
    const locale = pathname.split('/')[1] || 'ko'
    const loginUrl = new URL(`/${locale}/login`, request.url)
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
