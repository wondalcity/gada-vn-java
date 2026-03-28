import { Outlet, NavLink, useNavigate } from 'react-router-dom'

const NAV = [
  { to: '/', label: '📊 대시보드', exact: true },
  { to: '/managers', label: '👔 관리자 승인' },
  { to: '/managers/promote', label: '➕ 관리자 직접 지정' },
  { to: '/workers', label: '👷 근로자 관리' },
  { to: '/jobs', label: '🏗️ 일자리 관리' },
  { to: '/sites', label: '🏢 현장 관리' },
  { to: '/notifications', label: '🔔 알림 발송' },
]

export default function Layout() {
  const navigate = useNavigate()

  async function handleLogout() {
    await fetch('/logout', { method: 'POST', credentials: 'include' })
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F5] font-sans">
      <aside className="w-64 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <span className="text-xl font-bold text-[#0669F7]">가다 VN</span>
          <span className="ml-2 text-xs text-gray-400">Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => (
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
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full text-center text-xs text-gray-400 hover:text-white transition-colors"
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
