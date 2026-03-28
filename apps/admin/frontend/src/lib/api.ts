const BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized')
  }

  const text = await res.text()
  let body: Record<string, unknown> = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    // Non-JSON response (e.g. HTML) — throw so the caller can fall back to demo data
    throw new Error(`Non-JSON response (HTTP ${res.status})`)
  }

  if (!res.ok) {
    throw new Error((body?.message as string) || `HTTP ${res.status}`)
  }

  return (body?.data ?? body) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
