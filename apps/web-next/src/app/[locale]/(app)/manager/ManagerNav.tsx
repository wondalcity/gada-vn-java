'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  locale: string
}

export default function ManagerNav({ locale }: Props) {
  const pathname = usePathname()

  const tabs = [
    {
      key: 'home',
      href: `/${locale}/manager`,
      label: '홈',
      active: pathname === `/${locale}/manager`,
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      key: 'sites',
      href: `/${locale}/manager/sites`,
      label: '현장',
      active: pathname.startsWith(`/${locale}/manager/sites`),
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      key: 'jobs',
      href: `/${locale}/manager/jobs`,
      label: '공고',
      active: pathname.startsWith(`/${locale}/manager/jobs`),
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      key: 'hires',
      href: `/${locale}/manager/hires`,
      label: '채용',
      active: pathname.startsWith(`/${locale}/manager/hires`),
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      key: 'contracts',
      href: `/${locale}/manager/contracts`,
      label: '계약',
      active: pathname.startsWith(`/${locale}/manager/contracts`),
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
