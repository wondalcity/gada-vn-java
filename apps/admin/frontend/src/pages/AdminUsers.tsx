import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useAdminTranslation } from '../context/LanguageContext'
import { fmtDate, fmtDateTime } from '../lib/dateUtils'

interface AdminUserItem {
  id: string
  email: string
  name?: string
  role: string
  permissions: Record<string, boolean>
  status: string
  created_at: string
  last_login_at: string | null
}

const IN = 'w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]'
const LABEL = 'block text-xs font-medium text-gray-500 mb-1'

// ── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const { t } = useAdminTranslation()
  const ROLES = [
    { value: 'SUPER_ADMIN', label: t('admin_users.role_super_admin'), color: 'bg-purple-100 text-purple-700' },
    { value: 'ADMIN', label: t('admin_users.role_admin'), color: 'bg-blue-100 text-blue-700' },
    { value: 'VIEWER', label: t('admin_users.role_viewer'), color: 'bg-gray-100 text-gray-600' },
  ]
  const MENU_LABELS: Record<string, string> = {
    dashboard: t('admin_users.menu.dashboard'),
    managers: t('admin_users.menu.managers'),
    workers: t('admin_users.menu.workers'),
    jobs: t('admin_users.menu.jobs'),
    sites: t('admin_users.menu.sites'),
    notifications: t('admin_users.menu.notifications'),
    admin_users: t('admin_users.menu.admin_users'),
  }
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('ADMIN')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    dashboard: true, managers: true, workers: true, jobs: true,
    sites: true, notifications: false, admin_users: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [emailSent, setEmailSent] = useState<boolean | null>(null)

  function setRolePreset(r: string) {
    setRole(r)
    if (r === 'SUPER_ADMIN') {
      setPermissions({ dashboard: true, managers: true, workers: true, jobs: true, sites: true, notifications: true, admin_users: true })
    } else if (r === 'VIEWER') {
      setPermissions({ dashboard: true, managers: false, workers: false, jobs: false, sites: false, notifications: false, admin_users: false })
    } else {
      setPermissions({ dashboard: true, managers: true, workers: true, jobs: true, sites: true, notifications: false, admin_users: false })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.post<{ inviteUrl: string; email: string; emailSent: boolean }>('/admin/admin-users/invite', {
        email, name: name || undefined, role, permissions,
      })
      setInviteUrl(res.inviteUrl)
      setEmailSent(res.emailSent ?? false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('admin_users.invite_modal.invite_failed'))
    } finally {
      setSaving(false)
    }
  }

  if (inviteUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900">{t('admin_users.invite_modal.invite_done')}</h3>
          {emailSent ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{t('admin_users.invite_modal.email_sent')} · <span className="font-semibold">{email}</span></span>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              {t('admin_users.invite_modal.email_not_sent')}
            </div>
          )}
          <div>
            <label className={LABEL}>{t('admin_users.invite_modal.invite_link_label')}</label>
            <div className="flex gap-2">
              <input readOnly value={inviteUrl} className={`${IN} text-xs text-gray-500 bg-gray-50`} />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(inviteUrl)}
                className="px-3 py-2 rounded-2xl text-xs font-medium bg-[#0669F7] text-white hover:bg-[#0550C4]"
              >
                {t('admin_users.invite_modal.copy')}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onSave}
            className="w-full py-2.5 rounded-2xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4]"
          >
            {t('admin_users.invite_modal.close')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">{t('admin_users.invite_modal.title')}</h3>
        {error && <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 mb-3 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>{t('admin_users.invite_modal.email')}</label>
              <input required type="email" className={IN} value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div>
              <label className={LABEL}>{t('admin_users.invite_modal.name')}</label>
              <input className={IN} value={name} onChange={e => setName(e.target.value)} placeholder={t('admin_users.invite_modal.name_placeholder')} />
            </div>
          </div>

          <div>
            <label className={LABEL}>{t('admin_users.invite_modal.role')}</label>
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRolePreset(r.value)}
                  className={`flex-1 py-2 rounded-2xl text-xs font-semibold border transition-colors ${
                    role === r.value
                      ? 'bg-[#0669F7] text-white border-[#0669F7]'
                      : 'border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>{t('admin_users.invite_modal.permissions')}</label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-[#F8F9FB] rounded-xl border border-[#EFF1F5]">
              {Object.entries(MENU_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions[key] ?? false}
                    onChange={e => setPermissions(p => ({ ...p, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-[#0669F7]"
                  />
                  <span className="text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4] disabled:opacity-50">
              {saving ? t('admin_users.invite_modal.submitting') : t('admin_users.invite_modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Permissions Edit Modal ────────────────────────────────────────────────────

function PermissionsModal({
  user,
  onSave,
  onCancel,
}: {
  user: AdminUserItem
  onSave: () => void
  onCancel: () => void
}) {
  const { t } = useAdminTranslation()
  const ROLES = [
    { value: 'SUPER_ADMIN', label: t('admin_users.role_super_admin'), color: 'bg-purple-100 text-purple-700' },
    { value: 'ADMIN', label: t('admin_users.role_admin'), color: 'bg-blue-100 text-blue-700' },
    { value: 'VIEWER', label: t('admin_users.role_viewer'), color: 'bg-gray-100 text-gray-600' },
  ]
  const MENU_LABELS: Record<string, string> = {
    dashboard: t('admin_users.menu.dashboard'),
    managers: t('admin_users.menu.managers'),
    workers: t('admin_users.menu.workers'),
    jobs: t('admin_users.menu.jobs'),
    sites: t('admin_users.menu.sites'),
    notifications: t('admin_users.menu.notifications'),
    admin_users: t('admin_users.menu.admin_users'),
  }
  const [permissions, setPermissions] = useState<Record<string, boolean>>({ ...user.permissions })
  const [role, setRole] = useState(user.role)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await Promise.all([
        api.put(`/admin/admin-users/${user.id}/permissions`, { permissions }),
        user.role !== role ? api.put(`/admin/admin-users/${user.id}/role`, { role }) : Promise.resolve(),
      ])
      onSave()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('admin_users.permissions_modal.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900">{t('admin_users.permissions_modal.title')}</h3>
        <p className="text-sm text-gray-500">{user.email}</p>
        {error && <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 text-sm">{error}</div>}

        <div>
          <label className={LABEL}>{t('admin_users.permissions_modal.role')}</label>
          <div className="flex gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex-1 py-2 rounded-2xl text-xs font-semibold border transition-colors ${
                  role === r.value
                    ? 'bg-[#0669F7] text-white border-[#0669F7]'
                    : 'border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL}>{t('admin_users.permissions_modal.permissions')}</label>
          <div className="grid grid-cols-2 gap-2 p-3 bg-[#F8F9FB] rounded-xl border border-[#EFF1F5]">
            {Object.entries(MENU_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions[key] ?? false}
                  onChange={e => setPermissions(p => ({ ...p, [key]: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[#0669F7]"
                />
                <span className="text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]">{t('common.cancel')}</button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4] disabled:opacity-50">
            {saving ? t('admin_users.permissions_modal.saving') : t('admin_users.permissions_modal.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reset Password Modal ──────────────────────────────────────────────────────

function ResetPasswordModal({ user, onSave, onCancel }: { user: AdminUserItem; onSave: () => void; onCancel: () => void }) {
  const { t } = useAdminTranslation()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError(t('admin_users.reset_pw_modal.error_mismatch')); return }
    if (password.length < 8) { setError(t('admin_users.reset_pw_modal.error_min_length')); return }
    setSaving(true)
    setError('')
    try {
      await api.post(`/admin/admin-users/${user.id}/reset-password`, { password })
      onSave()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('admin_users.reset_pw_modal.change_failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">{t('admin_users.reset_pw_modal.title')}</h3>
        <p className="text-sm text-gray-500 mb-4">{user.email}</p>
        {error && <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 mb-3 text-sm">{error}</div>}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className={LABEL}>{t('admin_users.reset_pw_modal.new_password')}</label>
            <input required type="password" className={IN} value={password} onChange={e => setPassword(e.target.value)} placeholder={t('admin_users.reset_pw_modal.new_password_placeholder')} />
          </div>
          <div>
            <label className={LABEL}>{t('admin_users.reset_pw_modal.confirm')}</label>
            <input required type="password" className={IN} value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-[#EFF1F5] text-gray-600">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-[#D81A48] text-white disabled:opacity-50">
              {saving ? t('admin_users.reset_pw_modal.submitting') : t('admin_users.reset_pw_modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { t, locale } = useAdminTranslation()
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editUser, setEditUser] = useState<AdminUserItem | null>(null)
  const [resetUser, setResetUser] = useState<AdminUserItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const isSuperAdmin = me?.role === 'SUPER_ADMIN'

  const ROLES = [
    { value: 'SUPER_ADMIN', label: t('admin_users.role_super_admin'), color: 'bg-purple-100 text-purple-700' },
    { value: 'ADMIN', label: t('admin_users.role_admin'), color: 'bg-blue-100 text-blue-700' },
    { value: 'VIEWER', label: t('admin_users.role_viewer'), color: 'bg-gray-100 text-gray-600' },
  ]

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    INVITED: 'bg-amber-100 text-amber-700',
    DISABLED: 'bg-red-100 text-red-700',
  }
  const STATUS_LABELS: Record<string, string> = {
    ACTIVE: t('admin_users.status_active'),
    INVITED: t('admin_users.status_invited'),
    DISABLED: t('admin_users.status_disabled'),
  }

  const MENU_LABELS: Record<string, string> = {
    dashboard: t('admin_users.menu.dashboard'),
    managers: t('admin_users.menu.managers'),
    workers: t('admin_users.menu.workers'),
    jobs: t('admin_users.menu.jobs'),
    sites: t('admin_users.menu.sites'),
    notifications: t('admin_users.menu.notifications'),
    admin_users: t('admin_users.menu.admin_users'),
  }

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function load() {
    setLoading(true)
    api.get<AdminUserItem[]>('/admin/admin-users')
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const SUPER_ADMIN_EMAIL = 'admin@gada.vn'

  async function handleDisable(u: AdminUserItem) {
    if (!confirm(`"${u.email}" ${t('admin_users.confirm_disable')}`)) return
    try {
      await api.delete(`/admin/admin-users/${u.id}`)
      showMsg(t('admin_users.disabled'))
      load()
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : t('common.delete_failed'))
    }
  }

  async function handleDelete(u: AdminUserItem) {
    if (!confirm(`"${u.email}" ${t('admin_users.confirm_delete')}`)) return
    try {
      await api.delete(`/admin/admin-users/${u.id}/permanent`)
      showMsg(t('admin_users.deleted'))
      load()
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : t('common.delete_failed'))
    }
  }

  const roleMap = Object.fromEntries(ROLES.map(r => [r.value, r]))

  return (
    <div className="p-8">
      {showInvite && (
        <InviteModal onSave={() => { setShowInvite(false); load(); showMsg(t('admin_users.invite_issued')) }} onCancel={() => setShowInvite(false)} />
      )}
      {editUser && (
        <PermissionsModal user={editUser} onSave={() => { setEditUser(null); load(); showMsg(t('admin_users.permissions_saved')) }} onCancel={() => setEditUser(null)} />
      )}
      {resetUser && (
        <ResetPasswordModal user={resetUser} onSave={() => { setResetUser(null); showMsg(t('admin_users.password_changed')) }} onCancel={() => setResetUser(null)} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold shadow-lg bg-[#25282A] text-white whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin_users.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('admin_users.subtitle')}</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0669F7] hover:bg-[#0550C4] text-white text-sm font-medium rounded-2xl transition-colors"
          >
            {t('admin_users.invite')}
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {[t('admin_users.col_email'), t('admin_users.col_role'), t('admin_users.col_permissions'), t('admin_users.col_status'), t('admin_users.col_last_login'), t('common.created_at'), ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {users.map((u) => {
                const roleInfo = roleMap[u.role]
                return (
                  <tr key={u.id} className={`hover:bg-[#F8F9FB] ${u.status === 'DISABLED' ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">{u.email}</p>
                      {u.name && <p className="text-xs text-gray-400 mt-0.5">{u.name}</p>}
                      {u.id === me?.id && <span className="text-[10px] font-bold text-[#0669F7]">{t('admin_users.me')}</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleInfo?.color ?? 'bg-gray-100 text-gray-600'}`}>
                        {roleInfo?.label ?? u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {Object.entries(u.permissions)
                          .filter(([, v]) => v)
                          .map(([k]) => (
                            <span key={k} className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#EFF1F5] text-[#555]">
                              {MENU_LABELS[k]?.replace(/^.+ /, '') ?? k}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[u.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[u.status] ?? u.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {fmtDate(u.last_login_at, locale)}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {fmtDateTime(u.created_at)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {isSuperAdmin && u.id !== me?.id && u.email !== SUPER_ADMIN_EMAIL && (
                        <div className="flex gap-2 justify-end">
                          {u.status === 'ACTIVE' && (
                            <>
                              <button onClick={() => setEditUser(u)} className="text-xs text-[#0669F7] hover:underline">{t('admin_users.action_edit_permissions')}</button>
                              <button onClick={() => setResetUser(u)} className="text-xs text-gray-500 hover:underline">{t('admin_users.action_reset_password')}</button>
                              <button onClick={() => handleDisable(u)} className="text-xs text-[#D81A48] hover:underline">{t('admin_users.action_disable')}</button>
                            </>
                          )}
                          {u.status === 'INVITED' && (
                            <>
                              <button onClick={() => handleDisable(u)} className="text-xs text-[#D81A48] hover:underline">{t('admin_users.action_disable')}</button>
                              <button onClick={() => handleDelete(u)} className="text-xs text-[#D81A48] font-semibold hover:underline">{t('admin_users.action_delete')}</button>
                            </>
                          )}
                          {u.status === 'DISABLED' && (
                            <button onClick={() => handleDelete(u)} className="text-xs text-[#D81A48] font-semibold hover:underline">{t('admin_users.action_delete')}</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
