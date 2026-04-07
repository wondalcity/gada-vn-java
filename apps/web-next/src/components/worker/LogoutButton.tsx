'use client'

import { useRouter } from '@/i18n/navigation'
import { clearSessionCookie } from '../../lib/auth/session'

export function LogoutButton({ locale }: { locale: string }) {
  const router = useRouter()

  function handleLogout() {
    clearSessionCookie()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm text-[#7A7B7A] border border-[#DDDDDD] rounded-lg hover:bg-[#F2F4F5] transition-colors"
    >
      로그아웃
    </button>
  )
}
