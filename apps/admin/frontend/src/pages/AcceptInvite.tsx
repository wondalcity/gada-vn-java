import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

const IN = 'w-full border border-outline rounded-sm px-4 py-3 text-sm text-on-surface bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F2F4F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <p className="text-[#D81A48] font-semibold">유효하지 않은 초대 링크입니다.</p>
          <p className="text-sm text-gray-400 mt-2">관리자에게 새 초대 링크를 요청하세요.</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#F2F4F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">계정이 활성화되었습니다</h2>
          <p className="text-sm text-gray-500">이제 로그인하여 어드민 대시보드를 이용할 수 있습니다.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-2xl bg-[#0669F7] text-white font-semibold text-sm hover:bg-[#0550C4] transition-colors"
          >
            로그인 페이지로
          </button>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다'); return }
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/admin-users/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, name: name || undefined }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as Record<string, string>).message || `오류 (HTTP ${res.status})`)
      }
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F4F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full space-y-6">
        <div className="text-center">
          <span className="text-2xl font-bold text-[#0669F7]">가다 VN</span>
          <p className="text-xs text-gray-400 mt-1">Admin</p>
          <h2 className="text-xl font-bold text-gray-900 mt-4">계정 설정</h2>
          <p className="text-sm text-gray-500 mt-1">이름과 비밀번호를 설정하면 계정이 활성화됩니다.</p>
        </div>

        {error && (
          <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">이름 (선택)</label>
            <input
              className={IN}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">비밀번호 *</label>
            <input
              required
              type="password"
              className={IN}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8자 이상"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">비밀번호 확인 *</label>
            <input
              required
              type="password"
              className={IN}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-[#0669F7] text-white font-semibold text-sm hover:bg-[#0550C4] disabled:opacity-50 transition-colors"
          >
            {loading ? '처리 중...' : '계정 활성화'}
          </button>
        </form>
      </div>
    </div>
  )
}
