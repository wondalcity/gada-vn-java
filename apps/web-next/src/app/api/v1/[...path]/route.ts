/**
 * Catch-all proxy route: /api/v1/[...path]
 *
 * Forwards every browser request to the Kotlin backend using INTERNAL_API_URL
 * (a server-only env var that is never baked into the client bundle).
 * This eliminates CORS issues — the browser only ever talks to the Next.js
 * server (same origin), and Next.js proxies server-to-server.
 */
import { NextRequest, NextResponse } from 'next/server'

const BACKEND =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:7001/v1'

// Hop-by-hop headers must not be forwarded
const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathStr = path.join('/')
  const search = req.nextUrl.search
  const url = `${BACKEND}/${pathStr}${search}`

  // Forward request headers (strip hop-by-hop)
  const headers = new Headers()
  req.headers.forEach((value: string, key: string) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  let body: BodyInit | undefined
  if (hasBody) {
    body = await req.arrayBuffer()
  }

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      // Don't follow redirects — pass them through to the client
      redirect: 'manual',
    })

    const resHeaders = new Headers()
    upstream.headers.forEach((value: string, key: string) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        resHeaders.set(key, value)
      }
    })

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    })
  } catch (err) {
    console.error('[API proxy] upstream error:', url, err)
    return NextResponse.json(
      { statusCode: 502, message: 'Upstream unavailable' },
      { status: 502 },
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
