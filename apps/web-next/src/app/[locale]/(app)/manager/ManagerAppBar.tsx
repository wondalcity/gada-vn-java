'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { AuthUser } from '@/lib/auth/server'
import { PublicHeaderAuthMenu } from '@/components/public/PublicHeaderAuthMenu'
import ManagerSearchModal from '@/components/manager/ManagerSearchModal'

interface Props {
  locale: string
  user?: AuthUser | null
}

const MANAGER_ROOT_PATHS = (locale: string) => new Set([
  `/${locale}/manager`,
  `/${locale}/manager/sites`,
  `/${locale}/manager/jobs`,
  `/${locale}/manager/hires`,
  `/${locale}/manager/contracts`,
])

function getManagerPageTitle(pathname: string, locale: string): string {
  if (pathname.startsWith(`/${locale}/manager/sites/`) && pathname.includes('/jobs/new')) return '공고 등록'
  if (pathname.startsWith(`/${locale}/manager/sites/`)) return '현장 상세'
  if (pathname.startsWith(`/${locale}/manager/jobs/`) && pathname.endsWith('/edit')) return '공고 수정'
  if (pathname.startsWith(`/${locale}/manager/jobs/`)) return '공고 상세'
  if (pathname.startsWith(`/${locale}/manager/hires/`)) return '채용 상세'
  if (pathname.startsWith(`/${locale}/manager/contracts/`)) return '계약서'
  return ''
}

export function ManagerAppBar({ locale, user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const isRootPage = MANAGER_ROOT_PATHS(locale).has(pathname)
  const pageTitle = isRootPage ? '' : getManagerPageTitle(pathname, locale)

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
        {/* Mobile: back button on sub-pages, logo on root pages */}
        {isRootPage ? (
          <Link
            href={`/${locale}/manager`}
            className="md:hidden flex items-center gap-1.5 shrink-0"
          >
            <span className="text-xl font-black text-[#0669F7] tracking-tight">GADA</span>
            <span className="text-[10px] font-semibold bg-[#FDBC08] px-1.5 py-0.5 rounded-full leading-none text-[#25282A]">
              관리자
            </span>
          </Link>
        ) : (
          <div className="md:hidden flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#EFF1F5] transition-colors -ml-1"
            >
              <svg className="w-5 h-5 text-[#25282A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {pageTitle && (
              <span className="text-base font-semibold text-[#25282A]">{pageTitle}</span>
            )}
          </div>
        )}
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
