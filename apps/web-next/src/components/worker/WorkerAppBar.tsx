'use client'

import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import type { AuthUser } from '@/lib/auth/server'
import type { Province } from '@/lib/api/public'
import { PublicHeaderAuthMenu } from '@/components/public/PublicHeaderAuthMenu'
import { LocationsDropdown } from '@/components/public/LocationsDropdown'
import PublicHeaderSearch from '@/components/public/PublicHeaderSearch'
import { LocaleSwitcher } from '@/components/public/LocaleSwitcher'

interface Props {
  locale: string
  user?: AuthUser | null
  provinces?: Province[]
}

const WORKER_ROOT_PATHS = (locale: string) => new Set([
  '/worker',
  '/worker/home',
  '/worker/jobs',
  '/worker/applications',
  '/worker/attendance',
  '/worker/profile',
  '/worker/hires',
  '/worker/notifications',
  '/worker/contracts',
])

function getPageTitle(pathname: string, locale: string, t: ReturnType<typeof useTranslations<'worker'>>): string {
  if (pathname.startsWith('/worker/jobs/')) return t('app_bar.pages.job_detail')
  if (pathname.startsWith('/worker/applications/')) return t('app_bar.pages.application_detail')
  if (pathname.startsWith('/worker/hires/')) return t('app_bar.pages.hire_detail')
  if (pathname.startsWith('/worker/contracts/')) return t('app_bar.pages.contract')
  if (pathname === '/worker/profile/id-upload') return t('app_bar.pages.id_upload')
  if (pathname === '/worker/profile/id') return t('app_bar.pages.id_verify')
  if (pathname === '/worker/profile/experience') return t('app_bar.pages.career')
  if (pathname === '/worker/profile/signature') return t('app_bar.pages.signature')
  return ''
}

export function WorkerAppBar({ locale, user, provinces = [] }: Props) {
  const t = useTranslations('worker')
  const pathname = usePathname()
  const router = useRouter()
  const isRootPage = WORKER_ROOT_PATHS(locale).has(pathname)
  const pageTitle = isRootPage ? '' : getPageTitle(pathname, locale, t)

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
            href={'/worker'}
            className="md:hidden flex items-center shrink-0"
          >
            <img src="/logo.png" alt="GADA VN" className="h-8 w-auto" />
          </Link>
        ) : (
          <div className="md:hidden flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={t('app_bar.back_aria')}
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
          className="hidden md:flex items-center shrink-0"
        >
          <img src="/logo.png" alt="GADA VN" className="h-9 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          <Link
            href={'/worker/jobs'}
            className={navClass('/worker/jobs')}
          >
            {t('app_bar.jobs')}
          </Link>
          <LocationsDropdown locale={locale} provinces={provinces} />
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <PublicHeaderSearch locale={locale} />
          <Link
            href={'/worker/notifications'}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#EFF1F5] transition-colors"
            aria-label={t('app_bar.notifications_aria')}
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
              href={'/login'}
              className="text-sm font-semibold text-white bg-[#0669F7] hover:bg-[#0557D4] px-4 py-1.5 rounded-full transition-colors"
            >
              {t('app_bar.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
