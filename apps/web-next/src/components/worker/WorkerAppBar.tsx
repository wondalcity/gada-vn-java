'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { AuthUser } from '@/lib/auth/server'
import type { Province } from '@/lib/api/public'
import { PublicHeaderAuthMenu } from '@/components/public/PublicHeaderAuthMenu'
import { LocationsDropdown } from '@/components/public/LocationsDropdown'
import PublicHeaderSearch from '@/components/public/PublicHeaderSearch'

interface Props {
  locale: string
  user?: AuthUser | null
  provinces?: Province[]
}

const WORKER_ROOT_PATHS = (locale: string) => new Set([
  `/${locale}/worker`,
  `/${locale}/worker/jobs`,
  `/${locale}/worker/applications`,
  `/${locale}/worker/attendance`,
  `/${locale}/worker/profile`,
  `/${locale}/worker/hires`,
  `/${locale}/worker/notifications`,
  `/${locale}/worker/contracts`,
])

function getPageTitle(pathname: string, locale: string): string {
  if (pathname.startsWith(`/${locale}/worker/jobs/`)) return '공고 상세'
  if (pathname.startsWith(`/${locale}/worker/applications/`)) return '지원 상세'
  if (pathname.startsWith(`/${locale}/worker/hires/`)) return '채용 상세'
  if (pathname.startsWith(`/${locale}/worker/contracts/`)) return '계약서'
  if (pathname === `/${locale}/worker/profile/id-upload`) return '신분증 업로드'
  if (pathname === `/${locale}/worker/profile/id`) return '신분증 인증'
  if (pathname === `/${locale}/worker/profile/experience`) return '경력 관리'
  if (pathname === `/${locale}/worker/profile/signature`) return '서명'
  return ''
}

export function WorkerAppBar({ locale, user, provinces = [] }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const isRootPage = WORKER_ROOT_PATHS(locale).has(pathname)
  const pageTitle = isRootPage ? '' : getPageTitle(pathname, locale)

  function navClass(href: string) {
    const isJobsLink = href.endsWith('/worker/jobs')
    let active = false
    if (isJobsLink) active = pathname.startsWith(href)
    else active = pathname === href
    return `hover:text-[#0669F7] transition-colors ${active ? 'text-[#0669F7] font-semibold' : 'text-[#25282A]'}`
  }

  return (
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
            href={`/${locale}/worker`}
            className="md:hidden flex items-center gap-1.5 shrink-0"
          >
            <span className="text-xl font-black text-[#0669F7] tracking-tight">GADA</span>
            <span className="text-[10px] font-semibold text-white bg-[#0669F7] px-1.5 py-0.5 rounded-full leading-none">
              근로자
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
          <span className="text-xs text-[#98A2B2] font-medium">베트남 건설 일자리</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          <Link
            href={`/${locale}/worker/jobs`}
            className={navClass(`/${locale}/worker/jobs`)}
          >
            일자리 목록
          </Link>
          <LocationsDropdown locale={locale} provinces={provinces} />
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <PublicHeaderSearch locale={locale} />
          <Link
            href={`/${locale}/worker/notifications`}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#EFF1F5] transition-colors"
            aria-label="알림"
          >
            <svg className="w-5 h-5 text-[#25282A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </Link>

          {user ? (
            <div className="hidden md:block">
              <PublicHeaderAuthMenu
                locale={locale}
                userName={user.name}
                isManager={user.isManager}
              />
            </div>
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
  )
}
