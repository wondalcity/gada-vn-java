import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/signout?locale=ko
 *
 * Clears the gada_session cookie and redirects to the login page.
 * Used by server layouts when getAuthUser() returns null but the
 * stale cookie is still present — prevents the middleware redirect loop.
 */
export function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'ko'
  const response = NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  response.cookies.delete('gada_session')
  return response
}
