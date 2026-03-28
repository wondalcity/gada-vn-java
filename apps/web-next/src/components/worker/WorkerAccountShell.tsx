'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface Props {
  locale: string
  userName: string | null
  userPhone?: string | null
  isManager?: boolean
  children: React.ReactNode
}

interface SubItem {
  key: string
  label: string
  href: (locale: string) => string
}

interface NavItem {
  key: string
  label: string
  href: (locale: string) => string
  exact?: boolean
  icon: React.ReactNode
  subItems?: SubItem[]
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'home',
    label: '마이페이지',
    href: (locale) => `/${locale}/worker`,
    exact: true,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    key: 'applications',
    label: '지원 현황',
    href: (locale) => `/${locale}/worker/applications`,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    key: 'hires',
    label: '채용 현황',
    href: (locale) => `/${locale}/worker/hires`,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'attendance',
    label: '출퇴근 관리',
    href: (locale) => `/${locale}/worker/attendance`,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'contracts',
    label: '계약서',
    href: (locale) => `/${locale}/worker/contracts`,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: 'profile',
    label: '프로필 관리',
    href: (locale) => `/${locale}/worker/profile`,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    subItems: [
      { key: 'profile-id',         label: '신분증 인증',   href: (locale) => `/${locale}/worker/profile/id` },
      { key: 'profile-experience', label: '경력 사항',     href: (locale) => `/${locale}/worker/profile/experience` },
      { key: 'profile-signature',  label: '전자 서명',     href: (locale) => `/${locale}/worker/profile/signature` },
    ],
  },
  {
    key: 'notifications',
    label: '알림',
    href: (locale) => `/${locale}/worker/notifications`,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
]

export default function WorkerAccountShell({ locale, userName, userPhone, isManager, children }: Props) {
  const pathname = usePathname()
  const [profileExpanded, setProfileExpanded] = useState(() =>
    pathname.startsWith(`/${locale}/worker/profile`)
  )

  const displayName = userName ?? userPhone ?? '근로자'
  const initial = displayName.charAt(0).toUpperCase()

  function isItemActive(item: NavItem): boolean {
    const href = item.href(locale)
    if (item.exact) return pathname === href
    return pathname.startsWith(href)
  }

  function isSubItemActive(sub: SubItem): boolean {
    return pathname.startsWith(sub.href(locale))
  }

  // Mobile: section label derived from current path
  const currentSection = NAV_ITEMS.find(item => isItemActive(item))

  return (
    <div className="max-w-[1760px] mx-auto px-4 py-4 md:py-8">
      {/* ── Mobile section breadcrumb + sub-nav (desktop sidebar alternative) ── */}
      <div className="md:hidden mb-4">
        {/* Section heading */}
        {currentSection && currentSection.key !== 'home' && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#98A2B2]">
              {currentSection.icon}
            </span>
            <h2 className="text-base font-bold text-[#25282A]">{currentSection.label}</h2>
            {/* Sub-items for profile */}
            {currentSection.subItems && (
              <div className="flex gap-1 ml-auto overflow-x-auto scrollbar-hide">
                {currentSection.subItems.map((sub) => {
                  const subActive = isSubItemActive(sub)
                  return (
                    <Link
                      key={sub.key}
                      href={sub.href(locale) as never}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                        subActive
                          ? 'bg-[#0669F7] text-white'
                          : 'bg-white text-[#4B5563] border border-[#EFF1F5]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${subActive ? 'bg-white' : 'bg-[#D1D5DB]'}`} />
                      {sub.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop layout: sidebar + content ── */}
      <div className="md:grid md:grid-cols-[240px_1fr] md:gap-8 md:items-start">

        {/* ── LNB sidebar (desktop only) ── */}
        <aside
          className="hidden md:flex flex-col gap-3 sticky"
          style={{ top: 'calc(var(--app-bar-height, 56px) + 24px)' }}
        >
          {/* Mini profile card */}
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white border border-[#EFF1F5] shadow-sm">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0669F7] to-[#1A4FD6] flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#25282A] truncate">{displayName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#E6F0FE] text-[#0669F7] leading-none">
                  근로자
                </span>
                {isManager && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#856404] border border-[#F5D87D] leading-none">
                    관리자
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="bg-white rounded-2xl border border-[#EFF1F5] overflow-hidden shadow-sm">
            {NAV_ITEMS.map((item, idx) => {
              const active = isItemActive(item)
              const hasSubItems = item.subItems && item.subItems.length > 0
              const isExpanded = item.key === 'profile' ? profileExpanded : false
              const isLast = idx === NAV_ITEMS.length - 1

              return (
                <div key={item.key}>
                  {/* Main nav row */}
                  <div className={`relative flex items-center group ${!isLast && !isExpanded ? 'border-b border-[#EFF1F5]' : ''}`}>
                    {/* Active left accent bar */}
                    {active && (
                      <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[#0669F7]" />
                    )}

                    <Link
                      href={item.href(locale) as never}
                      onClick={() => {
                        if (hasSubItems) setProfileExpanded(true)
                      }}
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

                    {/* Sub-menu toggle button (for items with sub-items) */}
                    {hasSubItems && (
                      <button
                        onClick={() => setProfileExpanded((v) => !v)}
                        className={`pr-3 pl-1 py-3 shrink-0 transition-colors ${
                          active ? 'text-[#0669F7]' : 'text-[#98A2B2] hover:text-[#4B5563]'
                        }`}
                        aria-label="Toggle sub-menu"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Sub-items */}
                  {hasSubItems && isExpanded && (
                    <div className={`bg-[#F7F8FA] ${!isLast ? 'border-b border-[#EFF1F5]' : ''}`}>
                      {item.subItems!.map((sub, sIdx) => {
                        const subActive = isSubItemActive(sub)
                        const isSubLast = sIdx === item.subItems!.length - 1
                        return (
                          <Link
                            key={sub.key}
                            href={sub.href(locale) as never}
                            className={`relative flex items-center gap-2.5 pl-10 pr-4 py-2.5 text-xs font-medium transition-colors ${
                              !isSubLast ? 'border-b border-[#EFF1F5]' : ''
                            } ${
                              subActive
                                ? 'text-[#0669F7] bg-[#EEF5FF]'
                                : 'text-[#6B7280] hover:text-[#25282A] hover:bg-[#F0F1F3]'
                            }`}
                          >
                            {/* Sub-item dot indicator */}
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${subActive ? 'bg-[#0669F7]' : 'bg-[#D1D5DB]'}`} />
                            {sub.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Manager switch */}
          {isManager && (
            <Link
              href={`/${locale}/manager` as never}
              className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#0669F7] to-[#1A4FD6] text-white rounded-2xl text-sm font-semibold hover:from-[#0554D6] hover:to-[#1440B8] transition-all shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                관리자 화면
              </div>
              <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </aside>

        {/* ── Page content ── */}
        <div className="min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}
