'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { clearSessionCookie } from '@/lib/auth/session'

interface Props {
  locale: string
  userName: string | null
  isManager: boolean
  isManagerContext?: boolean
}

export function PublicHeaderAuthMenu({ locale, userName, isManager, isManagerContext = false }: Props) {
  const router = useRouter()
  const t = useTranslations('common')
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function logout() {
    clearSessionCookie()
    router.push('/login')
  }

  // If name looks like a phone number (starts with + or is all digits), use a fallback label
  const isPhoneName = userName ? /^\+?\d[\d\s\-]{5,}$/.test(userName.trim()) : false
  const displayName = (!userName || isPhoneName) ? t('nav.my_account') : userName
  const initial = isPhoneName || !userName ? t('nav.my_account').charAt(0) : displayName.charAt(0).toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-medium text-[#25282A] hover:text-[#0669F7] transition-colors px-2 py-1.5 rounded-full hover:bg-[#EFF1F5]"
      >
        <span className="w-7 h-7 rounded-full bg-[#0669F7] text-white text-xs font-bold flex items-center justify-center shrink-0">
          {initial}
        </span>
        <span className="hidden sm:block max-w-[100px] truncate">{displayName}</span>
        <svg className={`w-3.5 h-3.5 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl py-1 z-50" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {/* User info */}
          <div className="px-4 py-2.5 border-b border-[#EFF1F5]">
            <p className="text-sm font-semibold text-[#25282A] truncate">{displayName}</p>
            {isPhoneName && userName && (
              <p className="text-xs text-[#98A2B2] truncate">{userName}</p>
            )}
          </div>

          {/* Jobs — mobile only (desktop has it in nav) */}
          <Link
            href={'/jobs'}
            className="md:hidden flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#25282A] hover:bg-[#EFF1F5] hover:text-[#0669F7]"
            onClick={() => setOpen(false)}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {t('nav.jobs')}
          </Link>

          {/* My page — hidden in manager context */}
          {!isManagerContext && (
            <Link
              href={'/worker'}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#25282A] hover:bg-[#EFF1F5] hover:text-[#0669F7]"
              onClick={() => setOpen(false)}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t('nav.my_page')}
            </Link>
          )}

          {/* Applications — hidden in manager context */}
          {!isManagerContext && (
            <Link
              href={'/worker/applications'}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#25282A] hover:bg-[#EFF1F5] hover:text-[#0669F7]"
              onClick={() => setOpen(false)}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {t('nav.applications_status')}
            </Link>
          )}

          {/* Manager page */}
          {isManager && (
            <Link
              href={'/manager'}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#0669F7] font-semibold hover:bg-[#E6F0FE]"
              onClick={() => setOpen(false)}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {t('nav.manager_page')}
            </Link>
          )}

          {/* Logout */}
          <div className="border-t border-[#EFF1F5] mt-1">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#98A2B2] hover:bg-[#FDE8EE] hover:text-[#ED1C24]"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t('nav.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
