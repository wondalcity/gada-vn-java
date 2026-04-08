'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

interface Props {
  locale: string
}

export default function WorkerNav({ locale }: Props) {
  const pathname = usePathname()
  const t = useTranslations('common')

  const tabs = [
    {
      key: 'home',
      href: '/worker/home',
      label: t('worker_nav.home'),
      active: pathname === '/worker/home',
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      key: 'jobs',
      href: '/worker/jobs',
      label: t('worker_nav.jobs'),
      active: pathname.startsWith('/worker/jobs'),
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: 'applications',
      href: '/worker/applications',
      label: t('worker_nav.applications'),
      active: pathname.startsWith('/worker/applications') || pathname.startsWith('/worker/hires'),
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      key: 'attendance',
      href: '/worker/attendance',
      label: t('worker_nav.attendance'),
      active: pathname.startsWith('/worker/attendance'),
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: 'mypage',
      href: '/worker',
      label: t('worker_nav.mypage'),
      active: pathname === '/worker' || pathname.startsWith('/worker/profile') || pathname.startsWith('/worker/contracts'),
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <nav
      className="tab-bar flex md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#EFF1F5]"
      style={{ boxShadow: '0 -2px 16px rgba(0,0,0,0.06)' }}
    >
      <div
        className="flex w-full"
        style={{ height: 'var(--tab-bar-height)' }}
      >
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href as never}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:opacity-70 ${
              tab.active ? 'text-[#0669F7]' : 'text-[#98A2B2]'
            }`}
          >
            <span className={`flex items-center justify-center w-10 h-7 rounded-2xl transition-all ${
              tab.active ? 'bg-[#E6F0FE]' : ''
            }`}>
              {tab.icon(tab.active)}
            </span>
            <span className={`text-[10px] leading-none transition-all ${
              tab.active ? 'font-bold' : 'font-medium'
            }`}>
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
