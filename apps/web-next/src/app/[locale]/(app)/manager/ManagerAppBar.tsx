'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AuthUser } from '@/lib/auth/server'
import { PublicHeaderAuthMenu } from '@/components/public/PublicHeaderAuthMenu'
import ManagerSearchModal from '@/components/manager/ManagerSearchModal'

interface Props {
  locale: string
  user?: AuthUser | null
}

export function ManagerAppBar({ locale, user }: Props) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)

  function navClass(href: string, exact = false) {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return `hover:text-[#0669F7] transition-colors ${active ? 'text-[#0669F7] font-semibold' : 'text-[#25282A]'}`
  }

  return (
    <>
    <header
      className="app-bar fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#EFF1F5]"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <div
        className="flex items-center justify-between px-4 sm:px-6 xl:px-20 mx-auto max-w-[1760px]"
        style={{ height: 'var(--app-bar-height)' }}
      >
        {/* Logo — mobile: manager home / desktop: landing page */}
        <Link
          href={`/${locale}/manager`}
          className="md:hidden flex items-center gap-1.5 shrink-0"
        >
          <span className="text-xl font-black text-[#0669F7] tracking-tight">GADA</span>
          <span className="text-[10px] font-semibold bg-[#FDBC08] px-1.5 py-0.5 rounded-full leading-none text-[#25282A]">
            관리자
          </span>
        </Link>
        <Link
          href={'/' as never}
          className="hidden md:flex items-center gap-2 shrink-0"
        >
          <span className="text-xl font-black text-[#0669F7] tracking-tight">GADA</span>
          <span className="text-xs text-[#98A2B2] font-medium">관리자</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href={`/${locale}/manager` as never} className={navClass(`/${locale}/manager`, true)}>
            홈
          </Link>
          <Link href={`/${locale}/manager/sites` as never} className={navClass(`/${locale}/manager/sites`)}>
            현장 관리
          </Link>
          <Link href={`/${locale}/manager/jobs` as never} className={navClass(`/${locale}/manager/jobs`)}>
            공고 관리
          </Link>
          <Link href={`/${locale}/manager/hires` as never} className={navClass(`/${locale}/manager/hires`)}>
            채용 관리
          </Link>
          <Link href={`/${locale}/manager/contracts` as never} className={navClass(`/${locale}/manager/contracts`)}>
            계약 관리
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Search button */}
          <button
            type="button"
            aria-label="검색"
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full text-[#98A2B2] hover:text-[#0669F7] hover:bg-[#EFF1F5] transition-colors"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          {/* Worker view shortcut — icon only on mobile, icon+text on desktop */}
          <Link
            href={`/${locale}/worker`}
            className="flex items-center gap-1.5 mr-1 text-xs font-medium text-[#98A2B2] hover:text-[#0669F7] px-2.5 py-1.5 rounded-full hover:bg-[#EFF1F5] transition-colors border border-[#EFF1F5] hover:border-[#0669F7]"
            aria-label="근로자 화면으로 전환"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden md:inline">근로자 화면</span>
          </Link>

          {user ? (
            <PublicHeaderAuthMenu
              locale={locale}
              userName={user.name}
              isManager={user.isManager}
            />
          ) : (
            <Link
              href={`/${locale}/login`}
              className="text-sm font-semibold text-white bg-[#0669F7] hover:bg-blue-700 px-4 py-1.5 rounded-full transition-colors"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>

    <ManagerSearchModal
      locale={locale}
      open={searchOpen}
      onClose={() => setSearchOpen(false)}
    />
    </>
  )
}
