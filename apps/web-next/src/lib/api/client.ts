// Server-side: prefer INTERNAL_API_URL (direct container-to-container) to avoid
// routing through the public load balancer, which can cause loopback issues on EC2.
// Client-side: must use NEXT_PUBLIC_API_BASE_URL (baked at build time).
const API_BASE =
  typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.gada.vn/api/v1')
    : (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.gada.vn/api/v1')

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ApiResponse<T> {
  statusCode: number
  data: T
  meta?: { page: number; limit: number; total: number; totalPages: number }
}

export async function apiClient<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<ApiResponse<T>> {
  const { token, ...fetchOptions } = options
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers ?? {}),
  }

  // Show global loading bar (client-side only, lazy import to avoid SSR issues)
  let dec: (() => void) | null = null
  if (typeof window !== 'undefined') {
    const { incrementLoading, decrementLoading } = await import(
      '@/components/ui/GlobalLoadingBar'
    )
    incrementLoading()
    dec = decrementLoading
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers })
    const body = await res.json()

    if (!res.ok) {
      throw new ApiError(res.status, body.message ?? 'API error', body.errors)
    }

    return body as ApiResponse<T>
  } finally {
    dec?.()
  }
}
