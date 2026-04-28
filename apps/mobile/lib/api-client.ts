import * as SecureStore from 'expo-secure-store';
import { recordApiError } from './crashlytics';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/v1';

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// API가 snake_case로 응답하는 경우를 대비해 camelCase로 자동 변환
function toCamelKey(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function camelizeKeys<T>(val: unknown): T {
  if (Array.isArray(val)) return val.map(camelizeKeys) as T;
  if (val !== null && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val as Record<string, unknown>).map(([k, v]) => [
        toCamelKey(k), camelizeKeys(v),
      ]),
    ) as T;
  }
  return val as T;
}

async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
}

async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined>;
    skipAuth?: boolean;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': 'ko',
  };

  if (!options?.skipAuth) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let url = `${BASE_URL}${path}`;
  if (options?.params) {
    const query = Object.entries(options.params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (query) url += `?${query}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await response.json();

  if (!response.ok) {
    const message = json.message || 'Request failed';
    recordApiError(method, path, response.status, message);
    throw new ApiError(response.status, message);
  }

  return camelizeKeys<T>(json.data);
}

async function requestPaginated<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<{ data: T[]; meta: { total: number; page: number; totalPages: number } }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': 'ko',
  };
  const token = await getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (query) url += `?${query}`;
  }

  const response = await fetch(url, { method: 'GET', headers });
  const json = await response.json();

  if (!response.ok) {
    const message = json.message || 'Request failed';
    recordApiError('GET', path, response.status, message);
    throw new ApiError(response.status, message);
  }

  const data = camelizeKeys<T[]>(Array.isArray(json.data) ? json.data : []);
  const meta = camelizeKeys<{ total: number; page: number; totalPages: number }>(json.meta ?? {
    total: Array.isArray(json.data) ? json.data.length : 0,
    page: 1,
    totalPages: 1,
  });
  return { data, meta };
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>('GET', path, { params }),
  getPaginated: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    requestPaginated<T>(path, params),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export { ApiError };
