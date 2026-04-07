import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/signout?locale=ko
 *
 * Clears the gada_session cookie and redirects to the login page.
 * Used by server layouts when getAuthUser() returns null but the
 * stale cookie is still present — prevents the middleware redirect loop.
 *
 * NOTE: Must use x-forwarded-proto/host headers (set by nginx) to build
 * the correct public-facing URL. Falling back to request.url would produce
 * http://0.0.0.0:3000/... inside the Docker container.
 */
export function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'ko'

  // Build absolute URL using the public-facing host from nginx headers
  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '0.0.0.0'
  const base = `${proto}://${host}`

  const response = NextResponse.redirect(new URL(`/${locale}/login`, base))
  response.cookies.delete('gada_session')
  return response
}
