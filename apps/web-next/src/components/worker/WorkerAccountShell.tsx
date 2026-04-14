'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ManagerActionButton } from './ManagerActionButton'

interface Props {
  locale: string
  userName: string | null
  userPhone?: string | null
  isManager?: boolean
  managerStatus?: 'active' | 'pending' | null
  children: React.ReactNode
}

interface NavItem {
  key: string
  label: string
  href: (locale: string) => string
  exact?: boolean
  icon: React.ReactNode
}

export default function WorkerAccountShell({ locale, userName, userPhone, isManager, managerStatus, children }: Props) {
  const pathname = usePathname()
  const t = useTranslations('common')

  const NAV_ITEMS: NavItem[] = [
    {
      key: 'home',
      label: t('worker_sidebar.home'),
      href: (locale) => '/worker',
      exact: true,
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      key: 'applications',
      label: t('worker_sidebar.applications'),
      href: (locale) => '/worker/applications',
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      key: 'hires',
      label: t('worker_sidebar.hires'),
      href: (locale) => '/worker/hires',
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: 'attendance',
      label: t('worker_sidebar.attendance'),
      href: (locale) => '/worker/attendance',
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: 'contracts',
      label: t('worker_sidebar.contracts'),
      href: (locale) => '/worker/contracts',
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      key: 'profile',
      label: t('worker_sidebar.profile'),
      href: (locale) => '/worker/profile',
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      key: 'notifications',
      label: t('worker_sidebar.notifications'),
      href: (locale) => '/worker/notifications',
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      key: 'settings',
      label: t('settings.title'),
      href: (locale) => '/worker/settings',
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  const displayName = userName ?? userPhone ?? t('worker_badge.worker')
  const initial = displayName.charAt(0).toUpperCase()

  function isItemActive(item: NavItem): boolean {
    const href = item.href(locale)
    if (item.exact) return pathname === href
    return pathname.startsWith(href)
  }

  // Mobile: section label derived from current path
  const currentSection = NAV_ITEMS.find(item => isItemActive(item))

  return (
    <div className="max-w-[1760px] mx-auto px-4 py-4 md:py-8">
      {/* ── Mobile section breadcrumb + sub-nav (desktop sidebar alternative) ── */}
      <div className="md:hidden mb-4">
        {/* Section heading — hidden on mobile */}
      </div>

      {/* ── Desktop layout: sidebar + content ── */}
      <div className="md:grid md:grid-cols-[280px_1fr] md:gap-8 md:items-start">

        {/* ── LNB sidebar (desktop only) ── */}
        <aside
          className="hidden md:flex flex-col sticky"
          style={{
            top: 'calc(var(--app-bar-height, 56px) + 24px)',
            maxHeight: 'calc(100vh - var(--app-bar-height, 56px) - 48px)',
          }}
        >
          {/* Mini profile card */}
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white border border-[#EFF1F5] shadow-sm shrink-0 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#0669F7] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#25282A] truncate">{displayName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#E6F0FE] text-[#0669F7] leading-none">
                  {t('worker_badge.worker')}
                </span>
                {isManager && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#856404] border border-[#F5D87D] leading-none">
                    {t('worker_badge.manager')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Nav links — flex-1 so it fills remaining space */}
          <nav className="flex-1 bg-white rounded-2xl border border-[#EFF1F5] overflow-y-auto shadow-sm mb-3 min-h-0">
            {NAV_ITEMS.map((item, idx) => {
              const active = isItemActive(item)
              const isLast = idx === NAV_ITEMS.length - 1

              return (
                <div key={item.key}>
                  <div className={`relative flex items-center group ${!isLast ? 'border-b border-[#EFF1F5]' : ''}`}>
                    {active && (
                      <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[#0669F7]" />
                    )}
                    <Link
                      href={item.href(locale) as never}
                      className={`flex-1 flex items-center gap-3 pl-5 pr-3 py-3 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[#EEF5FF] text-[#0669F7]'
                          : 'text-[#4B5563] hover:bg-[#F7F8FA] hover:text-[#25282A]'
                      }`}
                    >
                      <span className={`shrink-0 ${active ? 'text-[#0669F7]' : 'text-[#98A2B2] group-hover:text-[#4B5563]'}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </nav>

          {/* Manager action — always pinned at bottom of sidebar */}
          <div className="shrink-0">
            <ManagerActionButton
              locale={locale}
              isManager={isManager ?? false}
              managerStatus={managerStatus}
              variant="sidebar"
            />
          </div>
        </aside>

        {/* ── Page content ── */}
        <div className="min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}
