import { cookies } from 'next/headers'
import { apiClient } from '../api/client'

export interface AuthUser {
  id: string
  name: string | null
  phone?: string
  email?: string
  role: string
  roles: string[]   // uppercase: ['WORKER', 'MANAGER', ...]
  status: string
  isManager: boolean
  isAdmin: boolean
  managerStatus: 'active' | 'pending' | null
}

interface MeResponse {
  id: string
  name: string | null
  phone?: string
  email?: string
  role: string
  roles: string[]
  status: string
  isManager?: boolean
  managerStatus?: string | null
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('gada_session')?.value
  if (!token) return null

  try {
    const res = await apiClient<MeResponse>('/auth/me', {
      token,
      cache: 'no-store',
    })
    const data = res.data
    return {
      ...data,
      isManager: data.isManager ?? data.roles.includes('MANAGER'),
      isAdmin: data.roles.includes('ADMIN'),
      managerStatus: (data.managerStatus ?? null) as 'active' | 'pending' | null,
    }
  } catch {
    return null
  }
}
