import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

const IN = 'w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]'

const ALL_NAV = [
  { to: '/',               label: '📊 대시보드',        permission: 'dashboard' as const, exact: true },
  { to: '/managers',       label: '👔 관리자 승인',      permission: 'managers' as const },
  { to: '/managers/promote', label: '➕ 관리자 직접 지정', permission: 'managers' as const },
  { to: '/workers',        label: '👷 근로자 관리',      permission: 'workers' as const },
  { to: '/jobs',           label: '🏗️ 일자리 관리',     permission: 'jobs' as const },
  { to: '/sites',          label: '🏗️ 현장 관리',        permission: 'sites' as const },
  { to: '/companies',     label: '🏢 건설사 관리',       permission: 'sites' as const },
  { to: '/notifications',  label: '🔔 알림 발송',        permission: 'notifications' as const },
  { to: '/admin-users',    label: '🔑 어드민 계정',      permission: 'admin_users' as const },
]

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: '슈퍼관리자',
  ADMIN: '관리자',
  VIEWER: '뷰어',
}
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'text-purple-400',
  ADMIN: 'text-blue-400',
  VIEWER: 'text-gray-400',
}

// ── Change Password Modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirm) { setError('새 비밀번호가 일치하지 않습니다'); return }
    if (newPw.length < 8) { setError('비밀번호는 8자 이상이어야 합니다'); return }
    setSaving(true); setError('')
    try {
      await api.post('/admin/admin-users/me/change-password', { oldPassword: oldPw, newPassword: newPw })
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '변경 실패')
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
          <p className="text-sm font-semibold text-gray-900">비밀번호가 변경되었습니다</p>
          <button onClick={onClose} className="w-full py-2.5 rounded-2xl bg-[#0669F7] text-white text-sm font-semibold">확인</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">비밀번호 변경</h3>
        {error && <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 mb-3 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">현재 비밀번호</label>
            <input required type="password" className={IN} value={oldPw} onChange={e => setOldPw(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">새 비밀번호 (8자 이상)</label>
            <input required type="password" className={IN} value={newPw} onChange={e => setNewPw(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">새 비밀번호 확인</label>
            <input required type="password" className={IN} value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]">취소</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4] disabled:opacity-50">
              {saving ? '변경 중...' : '변경'}
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
            visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors
                   ${isActive ? 'bg-[#0669F7] text-white' : 'text-gray-300 hover:bg-white/10'}`
                }
              >
                {item.label}
              </NavLink>
            ))
          )}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          {user && (
            <div className="px-2 pb-1">
              <p className="text-xs font-semibold text-white truncate">{user.name ?? user.email}</p>
              <p className={`text-[11px] ${ROLE_COLORS[user.role] ?? 'text-gray-400'}`}>
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
            </div>
          )}
          <button
            onClick={() => setShowChangePw(true)}
            className="w-full text-left px-2 py-1.5 text-xs text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
          >
            🔒 비밀번호 변경
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-2 py-1.5 text-xs text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
          >
            로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
