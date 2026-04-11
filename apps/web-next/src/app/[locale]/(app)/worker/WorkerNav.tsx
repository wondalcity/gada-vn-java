'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

// ── Icon pairs: outline (inactive) + solid (active) ──────────────────────────
// Outline icons: Heroicons v1 24px stroke-based
// Solid icons: Heroicons v1 20px fill-based
// Separating them prevents "filled blob" rendering on stroke-only paths.

function HomeOutline() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}
function HomeSolid() {
  return (
    <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  )
}

function JobsOutline() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
function JobsSolid() {
  return (
    <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
    </svg>
  )
}

function ApplicationsOutline() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}
function ApplicationsSolid() {
  return (
    <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )
}

function AttendanceOutline() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
function AttendanceSolid() {
  return (
    <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  )
}

function MypageOutline() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
function MypageSolid() {
  return (
    <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorkerNav({ locale: _locale }: { locale: string }) {
  const pathname = usePathname()
  const t = useTranslations('common')

  const tabs = [
    {
      key: 'home',
      href: '/worker/home',
      label: t('worker_nav.home'),
      active: pathname === '/worker/home',
      OutlineIcon: HomeOutline,
      SolidIcon: HomeSolid,
    },
    {
      key: 'jobs',
      href: '/worker/jobs',
      label: t('worker_nav.jobs'),
      active: pathname.startsWith('/worker/jobs'),
      OutlineIcon: JobsOutline,
      SolidIcon: JobsSolid,
    },
    {
      key: 'applications',
      href: '/worker/applications',
      label: t('worker_nav.applications'),
      active: pathname.startsWith('/worker/applications') || pathname.startsWith('/worker/hires'),
      OutlineIcon: ApplicationsOutline,
      SolidIcon: ApplicationsSolid,
    },
    {
      key: 'attendance',
      href: '/worker/attendance',
      label: t('worker_nav.attendance'),
      active: pathname.startsWith('/worker/attendance'),
      OutlineIcon: AttendanceOutline,
      SolidIcon: AttendanceSolid,
    },
    {
      key: 'mypage',
      href: '/worker',
      label: t('worker_nav.mypage'),
      active: pathname === '/worker' || pathname.startsWith('/worker/profile') || pathname.startsWith('/worker/contracts') || pathname.startsWith('/worker/settings'),
      OutlineIcon: MypageOutline,
      SolidIcon: MypageSolid,
    },
  ]

  return (
    <nav
      className="tab-bar flex md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#EFF1F5]"
      style={{ boxShadow: '0 -2px 16px rgba(0,0,0,0.06)' }}
    >
      <div className="flex w-full" style={{ height: 'var(--tab-bar-height)' }}>
        {tabs.map(({ key, href, label, active, OutlineIcon, SolidIcon }) => (
          <Link
            key={key}
            href={href as never}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:opacity-70 ${
              active ? 'text-[#0669F7]' : 'text-[#98A2B2]'
            }`}
          >
            <span className={`flex items-center justify-center w-10 h-7 rounded-2xl transition-all ${
              active ? 'bg-[#E6F0FE]' : ''
            }`}>
              {active ? <SolidIcon /> : <OutlineIcon />}
            </span>
            <span className={`text-[10px] leading-none transition-all ${
              active ? 'font-bold' : 'font-medium'
            }`}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
