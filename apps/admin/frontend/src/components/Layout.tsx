import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAdminTranslation } from '../context/LanguageContext'
import { api } from '../lib/api'

const IN = 'w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]'

type NavPermission = 'dashboard' | 'managers' | 'workers' | 'jobs' | 'sites' | 'notifications' | 'admin_users'

const ALL_NAV: { to: string; labelKey: string; permission: NavPermission; exact?: boolean }[] = [
  { to: '/',                 labelKey: 'nav.dashboard',         permission: 'dashboard', exact: true },
  { to: '/managers',         labelKey: 'nav.managers',          permission: 'managers' },
  { to: '/managers/promote', labelKey: 'nav.managers_promote',  permission: 'managers' },
  { to: '/workers',          labelKey: 'nav.workers',           permission: 'workers' },
  { to: '/jobs',             labelKey: 'nav.jobs',              permission: 'jobs' },
  { to: '/sites',            labelKey: 'nav.sites',             permission: 'sites' },
  { to: '/companies',        labelKey: 'nav.companies',         permission: 'sites' },
  { to: '/notifications',    labelKey: 'nav.notifications',     permission: 'notifications' },
  { to: '/admin-users',      labelKey: 'nav.admin_users',       permission: 'admin_users' },
]

const SETTINGS_NAV = { to: '/settings', labelKey: 'nav.settings' }

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'text-purple-400',
  ADMIN: 'text-blue-400',
  VIEWER: 'text-gray-400',
}

const ROLE_LABEL_KEYS: Record<string, string> = {
  SUPER_ADMIN: 'layout.role.super_admin',
  ADMIN: 'layout.role.admin',
  VIEWER: 'layout.role.viewer',
}

// ── Change Password Modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useAdminTranslation()
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirm) { setError(t('layout.pw_modal.error_mismatch')); return }
    if (newPw.length < 8) { setError(t('layout.pw_modal.error_min_length')); return }
    setSaving(true); setError('')
    try {
      await api.post('/admin/admin-users/me/change-password', { oldPassword: oldPw, newPassword: newPw })
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('layout.pw_modal.error_failed'))
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="text-sm font-semibold text-gray-900">{t('layout.pw_modal.success')}</p>
          <button onClick={onClose} className="w-full py-2.5 rounded-2xl bg-[#0669F7] text-white text-sm font-semibold">{t('layout.pw_modal.ok')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">{t('layout.pw_modal.title')}</h3>
        {error && <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 mb-3 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('layout.pw_modal.current')}</label>
            <input required type="password" className={IN} value={oldPw} onChange={e => setOldPw(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('layout.pw_modal.new')}</label>
            <input required type="password" className={IN} value={newPw} onChange={e => setNewPw(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('layout.pw_modal.confirm')}</label>
            <input required type="password" className={IN} value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]">{t('layout.pw_modal.cancel')}</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4] disabled:opacity-50">
              {saving ? t('layout.pw_modal.submitting') : t('layout.pw_modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function Layout() {
  const navigate = useNavigate()
  const { user, can, loading } = useAuth()
  const { t } = useAdminTranslation()
  const [showChangePw, setShowChangePw] = useState(false)

  async function handleLogout() {
    await fetch('/logout', { method: 'POST', credentials: 'include' })
    navigate('/login')
  }

  const visibleNav = ALL_NAV.filter((item) => can(item.permission))

  return (
    <div className="flex min-h-screen bg-[#F2F4F5] font-sans">
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}

      <aside className="w-64 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <span className="text-xl font-bold text-[#0669F7]">가다 VN</span>
          <span className="ml-2 text-xs text-gray-400">Admin</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-9 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {visibleNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors
                     ${isActive ? 'bg-[#0669F7] text-white' : 'text-gray-300 hover:bg-white/10'}`
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
              <div className="pt-2 border-t border-white/10">
                <NavLink
                  to={SETTINGS_NAV.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors
                     ${isActive ? 'bg-[#0669F7] text-white' : 'text-gray-300 hover:bg-white/10'}`
                  }
                >
                  {t(SETTINGS_NAV.labelKey)}
                </NavLink>
              </div>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          {user && (
            <div className="px-2 pb-1">
              <p className="text-xs font-semibold text-white truncate">{user.name ?? user.email}</p>
              <p className={`text-[11px] ${ROLE_COLORS[user.role] ?? 'text-gray-400'}`}>
                {t(ROLE_LABEL_KEYS[user.role] ?? '') || user.role}
              </p>
            </div>
          )}
          <button
            onClick={() => setShowChangePw(true)}
            className="w-full text-left px-2 py-1.5 text-xs text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
          >
            {t('layout.change_password')}
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-2 py-1.5 text-xs text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
          >
            {t('layout.logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
