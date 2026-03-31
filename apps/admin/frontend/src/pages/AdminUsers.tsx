import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'SUPER_ADMIN', label: '슈퍼관리자', color: 'bg-purple-100 text-purple-700' },
  { value: 'ADMIN', label: '관리자', color: 'bg-blue-100 text-blue-700' },
  { value: 'VIEWER', label: '뷰어', color: 'bg-gray-100 text-gray-600' },
]

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INVITED: 'bg-amber-100 text-amber-700',
  DISABLED: 'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  INVITED: '초대 대기',
  DISABLED: '비활성',
}

const MENU_LABELS: Record<string, string> = {
  dashboard: '📊 대시보드',
  managers: '👔 관리자 승인',
  workers: '👷 근로자 관리',
  jobs: '🏗️ 일자리 관리',
  sites: '🏢 현장 관리',
  notifications: '🔔 알림 발송',
  admin_users: '🔑 어드민 계정',
}

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
      const res = await api.post<{ inviteUrl: string; email: string }>('/admin/admin-users/invite', {
        email, name: name || undefined, role, permissions,
      })
      setInviteUrl(res.inviteUrl)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '초대 실패')
    } finally {
      setSaving(false)
    }
  }

  if (inviteUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900">초대 링크 발급 완료</h3>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
            <span className="font-semibold">{email}</span>에게 초대 링크를 전달하세요.
          </div>
          <div>
            <label className={LABEL}>초대 링크 (7일간 유효)</label>
            <div className="flex gap-2">
              <input readOnly value={inviteUrl} className={`${IN} text-xs text-gray-500 bg-gray-50`} />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(inviteUrl)}
                className="px-3 py-2 rounded-2xl text-xs font-medium bg-[#0669F7] text-white hover:bg-[#0550C4]"
              >
                복사
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onSave}
            className="w-full py-2.5 rounded-2xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4]"
          >
            닫기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">어드민 계정 초대</h3>
        {error && <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 mb-3 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>이메일 *</label>
              <input required type="email" className={IN} value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div>
              <label className={LABEL}>이름</label>
              <input className={IN} value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" />
            </div>
          </div>

          <div>
            <label className={LABEL}>등급 *</label>
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
            <label className={LABEL}>메뉴 접근 권한</label>
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
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]">취소</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4] disabled:opacity-50">
              {saving ? '처리 중...' : '초대 링크 발급'}
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
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900">권한 편집</h3>
        <p className="text-sm text-gray-500">{user.email}</p>
        {error && <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 text-sm">{error}</div>}

        <div>
          <label className={LABEL}>등급</label>
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
          <label className={LABEL}>메뉴 접근 권한</label>
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
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]">취소</button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4] disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reset Password Modal ──────────────────────────────────────────────────────

function ResetPasswordModal({ user, onSave, onCancel }: { user: AdminUserItem; onSave: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다'); return }
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다'); return }
    setSaving(true)
    setError('')
    try {
      await api.post(`/admin/admin-users/${user.id}/reset-password`, { password })
      onSave()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '변경 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">비밀번호 재설정</h3>
        <p className="text-sm text-gray-500 mb-4">{user.email}</p>
        {error && <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 mb-3 text-sm">{error}</div>}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className={LABEL}>새 비밀번호</label>
            <input required type="password" className={IN} value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상" />
          </div>
          <div>
            <label className={LABEL}>비밀번호 확인</label>
            <input required type="password" className={IN} value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-[#EFF1F5] text-gray-600">취소</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-[#D81A48] text-white disabled:opacity-50">
              {saving ? '변경 중...' : '비밀번호 재설정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editUser, setEditUser] = useState<AdminUserItem | null>(null)
  const [resetUser, setResetUser] = useState<AdminUserItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const isSuperAdmin = me?.role === 'SUPER_ADMIN'

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

  async function handleDisable(u: AdminUserItem) {
    if (!confirm(`"${u.email}" 계정을 비활성화하시겠습니까?`)) return
    try {
      await api.delete(`/admin/admin-users/${u.id}`)
      showMsg('비활성화되었습니다')
      load()
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : '실패')
    }
  }

  const roleMap = Object.fromEntries(ROLES.map(r => [r.value, r]))

  return (
    <div className="p-8">
      {showInvite && (
        <InviteModal onSave={() => { setShowInvite(false); load(); showMsg('초대 링크가 발급되었습니다') }} onCancel={() => setShowInvite(false)} />
      )}
      {editUser && (
        <PermissionsModal user={editUser} onSave={() => { setEditUser(null); load(); showMsg('권한이 저장되었습니다') }} onCancel={() => setEditUser(null)} />
      )}
      {resetUser && (
        <ResetPasswordModal user={resetUser} onSave={() => { setResetUser(null); showMsg('비밀번호가 변경되었습니다') }} onCancel={() => setResetUser(null)} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold shadow-lg bg-[#25282A] text-white whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">어드민 계정 관리</h1>
          <p className="text-sm text-gray-500 mt-1">메뉴별 접근 권한을 설정하고 이메일로 계정을 초대합니다</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0669F7] hover:bg-[#0550C4] text-white text-sm font-medium rounded-2xl transition-colors"
          >
            + 계정 초대
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F2F4F5]">
              <tr>
                {['이메일 / 이름', '등급', '메뉴 권한', '상태', '마지막 로그인', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {users.map((u) => {
                const roleInfo = roleMap[u.role]
                return (
                  <tr key={u.id} className={`hover:bg-[#F8F9FB] ${u.status === 'DISABLED' ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{u.email}</p>
                      {u.name && <p className="text-xs text-gray-400 mt-0.5">{u.name}</p>}
                      {u.id === me?.id && <span className="text-[10px] font-bold text-[#0669F7]">나</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleInfo?.color ?? 'bg-gray-100 text-gray-600'}`}>
                        {roleInfo?.label ?? u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
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
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[u.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[u.status] ?? u.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-5 py-4">
                      {isSuperAdmin && u.id !== me?.id && u.status !== 'DISABLED' && (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditUser(u)} className="text-xs text-[#0669F7] hover:underline">권한 편집</button>
                          <button onClick={() => setResetUser(u)} className="text-xs text-gray-500 hover:underline">비밀번호 재설정</button>
                          <button onClick={() => handleDisable(u)} className="text-xs text-[#D81A48] hover:underline">비활성화</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
