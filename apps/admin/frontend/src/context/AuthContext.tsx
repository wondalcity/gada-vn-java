import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'

export interface AdminPermissions {
  dashboard: boolean
  managers: boolean
  workers: boolean
  jobs: boolean
  sites: boolean
  notifications: boolean
  admin_users: boolean
}

export interface AdminUser {
  id: string
  email: string
  name?: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER'
  permissions: AdminPermissions
  status: string
  last_login_at?: string | null
}

interface AuthContextValue {
  user: AdminUser | null
  loading: boolean
  reload: () => void
  can: (key: keyof AdminPermissions) => boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  reload: () => {},
  can: () => false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    api.get<AdminUser>('/admin/admin-users/me')
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  const can = useCallback(
    (key: keyof AdminPermissions) => {
      if (!user) return false
      // SUPER_ADMIN always has full access regardless of stored permissions
      if (user.role === 'SUPER_ADMIN') return true
      return user.permissions?.[key] ?? false
    },
    [user],
  )

  return (
    <AuthContext.Provider value={{ user, loading, reload, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
