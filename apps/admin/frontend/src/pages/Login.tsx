import { useState, FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const hasError = searchParams.has('error')
  const hasLogout = searchParams.has('logout')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const form = new URLSearchParams()
    form.set('username', username)
    form.set('password', password)
    try {
      const res = await fetch('/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
        redirect: 'manual',
      })
      // Spring Security redirects on success
      if (res.status === 200 || res.status === 302 || res.type === 'opaqueredirect') {
        navigate('/')
      } else {
        navigate('/login?error')
      }
    } catch {
      navigate('/login?error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-[#0669F7]">가다 VN</span>
          <p className="text-gray-500 text-sm mt-1">Admin Panel</p>
        </div>
        {hasError && (
          <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-2xl p-3 mb-4 text-sm">
            아이디 또는 비밀번호가 틀렸습니다.
          </div>
        )}
        {hasLogout && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-3 mb-4 text-sm">
            로그아웃 되었습니다.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0669F7] hover:bg-[#0550C4] text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
