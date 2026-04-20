'use client'

import { useState } from 'react'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import type { AuthUser } from '@/lib/auth/server'
import { PublicHeaderAuthMenu } from '@/components/public/PublicHeaderAuthMenu'
import ManagerSearchModal from '@/components/manager/ManagerSearchModal'
import { LocaleSwitcher } from '@/components/public/LocaleSwitcher'

interface Props {
  locale: string
  user?: AuthUser | null
}

const MANAGER_ROOT_PATHS = (locale: string) => new Set([
  '/manager',
  '/manager/sites',
  '/manager/jobs',
  '/manager/hires',
  '/manager/contracts',
  '/manager/notifications',
  '/manager/profile',
  '/manager/my-listings',
  '/manager/settings',
])

type TFn = (key: string) => string

function getManagerPageTitle(pathname: string, locale: string, t: TFn): string {
  if (pathname.startsWith('/manager/sites/') && pathname.includes('/jobs/new')) return t('manager_app_bar.page_new_job')
  if (pathname.startsWith('/manager/sites/') && pathname.endsWith('/edit')) return t('manager_app_bar.page_edit_site')
  if (pathname.startsWith('/manager/sites/') && pathname.endsWith('/jobs')) return t('manager_app_bar.page_site_jobs')
  if (pathname.startsWith('/manager/sites/new')) return t('manager_app_bar.page_new_site')
  if (pathname.startsWith('/manager/sites/')) return t('manager_app_bar.page_site_detail')
  if (pathname.startsWith('/manager/jobs/') && pathname.endsWith('/edit')) return t('manager_app_bar.page_edit_job')
  if (pathname.startsWith('/manager/jobs/') && pathname.endsWith('/applicants')) return t('manager_app_bar.page_job_applicants')
  if (pathname.startsWith('/manager/jobs/') && pathname.endsWith('/attendance')) return t('manager_app_bar.page_job_attendance')
  if (pathname.startsWith('/manager/jobs/')) return t('manager_app_bar.page_job_detail')
  if (pathname.startsWith('/manager/hires/')) return t('manager_app_bar.page_hire_detail')
  if (pathname.startsWith('/manager/contracts/')) return t('manager_app_bar.page_contract')
  return ''
}

export function ManagerAppBar({ locale, user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('common')
  const [searchOpen, setSearchOpen] = useState(false)
  const isRootPage = MANAGER_ROOT_PATHS(locale).has(pathname)
  const pageTitle = isRootPage ? '' : getManagerPageTitle(pathname, locale, t as TFn)

  // Job-related sub-paths under /manager/sites (e.g. /manager/sites/{id}/jobs/new)
  const isOnSiteJobPath = pathname.startsWith('/manager/sites/') && pathname.includes('/jobs')

  function navClass(href: string, exact = false) {
    let active = exact ? pathname === href : pathname.startsWith(href)
    // /manager/sites nav: don't activate for site→job sub-paths (those belong to jobs nav)
    if (href === '/manager/sites' && isOnSiteJobPath) active = false
    // /manager/jobs nav: also activate for site→job sub-paths
    if (href === '/manager/jobs' && isOnSiteJobPath) active = true
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
            href={'/manager'}
            className="md:hidden flex items-center shrink-0"
          >
            <img src="/logo.png" alt="GADA VN" className="h-8 w-auto" />
          </Link>
        ) : (
          <div className="md:hidden flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={t('manager_app_bar.back')}
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
          href={'/manager' as never}
          className="hidden md:flex items-center shrink-0"
        >
          <img src="/logo.png" alt="GADA VN" className="h-9 w-auto" />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href={'/manager' as never} className={navClass('/manager', true)}>
            {t('manager_nav.home')}
          </Link>
          <Link href={'/manager/sites' as never} className={navClass('/manager/sites')}>
            {t('manager_nav.sites_full')}
          </Link>
          <Link href={'/manager/jobs' as never} className={navClass('/manager/jobs')}>
            {t('manager_nav.jobs_full')}
          </Link>
          <Link href={'/manager/hires' as never} className={navClass('/manager/hires')}>
            {t('manager_nav.hires_full')}
          </Link>
          <Link href={'/manager/contracts' as never} className={navClass('/manager/contracts')}>
            {t('manager_nav.contracts_full')}
          </Link>
          <Link href={'/manager/settings' as never} className={navClass('/manager/settings')}>
            {t('manager_nav.settings')}
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <a
            href="tel:+84568240240"
            className="hidden md:flex items-center gap-1.5 text-xs text-[#98A2B2] hover:text-[#0669F7] transition-colors mr-2 whitespace-nowrap"
            aria-label={t('manager_app_bar.support_phone_aria')}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            (+84) 568240240
          </a>
          <LocaleSwitcher />
          {/* Search button — visible on all sizes */}
          <button
            type="button"
            aria-label={t('manager_app_bar.search')}
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full text-[#98A2B2] hover:text-[#0669F7] hover:bg-[#EFF1F5] transition-colors"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Notification button — mobile only */}
          <Link
            href={'/manager/notifications' as never}
            aria-label={t('manager_app_bar.notifications')}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full text-[#98A2B2] hover:text-[#0669F7] hover:bg-[#EFF1F5] transition-colors"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </Link>

          {user ? (
            <div className="hidden md:block">
              <PublicHeaderAuthMenu
                locale={locale}
                userName={user.name}
                isManager={user.isManager}
                isManagerContext={true}
              />
            </div>
          ) : (
            <Link
              href={'/login'}
              className="text-sm font-semibold text-white bg-[#0669F7] hover:bg-[#0557D4] px-4 py-1.5 rounded-full transition-colors"
            >
              {t('manager_app_bar.login')}
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
