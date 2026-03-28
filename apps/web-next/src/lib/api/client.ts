const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

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

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers })
  const body = await res.json()

  if (!res.ok) {
    throw new ApiError(res.status, body.message ?? 'API error', body.errors)
  }

  return body as ApiResponse<T>
}
