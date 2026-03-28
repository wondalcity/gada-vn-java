'use client'

import * as React from 'react'
import Link from 'next/link'
import { getSessionCookie } from '@/lib/auth/session'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

interface Stats {
  activeSites: number
  openJobs: number
  pendingApplications: number
}

interface ManagerInfo {
  representative_name?: string
  company_name?: string
  phone?: string
}

interface Props {
  params: Promise<{ locale: string }>
}

export default function ManagerHomePage({ params }: Props) {
  const [locale, setLocale] = React.useState('ko')
  const idToken = getSessionCookie()
  const [stats, setStats] = React.useState<Stats | null>(null)
  const [managerInfo, setManagerInfo] = React.useState<ManagerInfo | null>(null)

  React.useEffect(() => {
    params.then(p => setLocale(p.locale))
  }, [params])

  React.useEffect(() => {
    if (!idToken) return
    Promise.all([
      fetch(`${API_BASE}/manager/dashboard`, {
        headers: { Authorization: `Bearer ${idToken}` },
      })
        .then(r => r.json())
        .then(body => setStats(body.data))
        .catch(() => {}),
      fetch(`${API_BASE}/managers/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      })
        .then(r => r.json())
        .then(body => setManagerInfo(body.data))
        .catch(() => {}),
    ])
  }, [idToken])

  const DEMO_STATS: Stats = { activeSites: 3, openJobs: 4, pendingApplications: 7 }
  const displayStats = stats ?? DEMO_STATS
  const isDemo = stats === null

  const displayName = managerInfo?.representative_name ?? managerInfo?.company_name ?? '관리자'
  const initial = displayName.charAt(0).toUpperCase()

  const statCards = [
    {
      label: '운영중 현장',
      value: displayStats.activeSites,
      href: `/${locale}/manager/sites`,
      color: '#0669F7',
      bg: '#E6F0FE',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      label: '모집중 공고',
      value: displayStats.openJobs,
      href: `/${locale}/manager/jobs`,
      color: '#1A6B1A',
      bg: '#E8FBE8',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: '검토 대기',
      value: displayStats.pendingApplications,
      href: `/${locale}/manager/hires`,
      color: '#856404',
      bg: '#FFF3CD',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  const quickActions = [
    { href: `/${locale}/manager/sites/new`, emoji: '🏗️', label: '현장등록' },
    { href: `/${locale}/manager/jobs`,      emoji: '📋', label: '공고관리' },
    { href: `/${locale}/manager/hires`,     emoji: '👥', label: '채용관리' },
    { href: `/${locale}/manager/contracts`, emoji: '📄', label: '계약서' },
  ]

  const menuCards = [
    {
      href: `/${locale}/manager/sites`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: '현장 관리',
      desc: '건설 현장 등록 및 이미지 관리',
      badge: displayStats.activeSites > 0 ? `${displayStats.activeSites}개` : null,
    },
    {
      href: `/${locale}/manager/jobs`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      title: '공고 관리',
      desc: '일자리 공고 등록·수정·마감',
      badge: displayStats.openJobs > 0 ? `모집중 ${displayStats.openJobs}` : null,
    },
    {
      href: `/${locale}/manager/hires`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: '채용 관리',
      desc: '지원자 검토 및 합격 처리',
      badge: displayStats.pendingApplications > 0 ? `대기 ${displayStats.pendingApplications}` : null,
      badgeUrgent: displayStats.pendingApplications > 0,
    },
    {
      href: `/${locale}/manager/contracts`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: '계약서 관리',
      desc: '전자계약 및 서명 현황',
      badge: null,
    },
  ]

  return (
    <div className="min-h-screen bg-[#F2F4F5]">
      <div className="max-w-[1760px] mx-auto px-4 pt-4 pb-6 md:pt-8 md:pb-10">

        {/* ──────────────────────────────────────────
            MOBILE ONLY: manager hero card
            ────────────────────────────────────────── */}
        <div className="md:hidden mb-4">
          <div
            className="rounded-2xl p-5 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1A4FD6 0%, #0669F7 60%, #0E86FF 100%)' }}
          >
            {/* Decorative circles */}
            <div className="absolute right-0 top-0 w-36 h-36 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4 pointer-events-none" />
            <div className="absolute right-8 bottom-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/2 pointer-events-none" />

            {/* Profile row */}
            <div className="relative flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-lg font-bold shrink-0">
                {initial}
              </div>
              <div>
                <p className="font-bold text-base leading-tight">{displayName}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDBC08] text-[#7A4700] leading-none">
                    관리자
                  </span>
                  {isDemo && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white leading-none">
                      데모
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="relative grid grid-cols-3 gap-2 border-t border-white/20 pt-4">
              {statCards.map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-extrabold leading-none">{value}</p>
                  <p className="text-blue-100 text-xs mt-1 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile quick action grid */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {quickActions.map(({ href, emoji, label }) => (
              <Link
                key={href}
                href={href as never}
                className="flex flex-col items-center gap-1.5 bg-white rounded-xl py-3 shadow-sm border border-[#EFF1F5] active:bg-[#E6F0FE] transition-colors"
              >
                <span className="text-xl leading-none">{emoji}</span>
                <span className="text-[11px] font-medium text-[#4B5563] leading-tight text-center">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ──────────────────────────────────────────
            DESKTOP ONLY: page header + stats
            ────────────────────────────────────────── */}
        <div className="hidden md:block mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-[#25282A]">관리자 홈</h1>
              <p className="text-sm text-[#98A2B2] mt-0.5">건설 현장과 일자리를 관리하세요</p>
            </div>
            <Link
              href={`/${locale}/manager/sites/new` as never}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0669F7] text-white text-sm font-semibold hover:bg-[#0554D6] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              새 현장 등록
            </Link>
          </div>

          {isDemo && (
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFF3CD] text-[#856404] border border-[#F5D87D]">
                데모 데이터
              </span>
              <span className="text-xs text-[#98A2B2]">API 연결 후 실제 데이터가 표시됩니다</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {statCards.map(({ label, value, href, color, bg, icon }) => (
              <Link
                key={label}
                href={href as never}
                className="rounded-2xl px-5 py-4 flex items-center justify-between hover:opacity-90 transition-opacity"
                style={{ backgroundColor: bg, border: `1px solid ${color}22` }}
              >
                <div>
                  <p className="text-xs font-medium" style={{ color }}>{label}</p>
                  <p className="text-3xl font-extrabold mt-0.5" style={{ color }}>{value}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center opacity-25" style={{ backgroundColor: color, color: '#fff' }}>
                  {icon}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ──────────────────────────────────────────
            Worker-view shortcut banner
            ────────────────────────────────────────── */}
        <Link
          href={`/${locale}/manager/my-listings` as never}
          className="flex items-center gap-3 mb-4 md:mb-6 p-4 rounded-xl bg-gradient-to-r from-[#0669F7] to-[#1E7FFF] text-white hover:opacity-95 transition-opacity active:opacity-80"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">내 현장·공고 보기</p>
            <p className="text-xs text-white/80 mt-0.5">근로자 화면으로 내 공고·현장을 확인하세요</p>
          </div>
          <svg className="w-4 h-4 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* ──────────────────────────────────────────
            Menu cards (1-col mobile, 2-col desktop)
            ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {menuCards.map((card) => (
            <Link
              key={card.href + card.title}
              href={card.href as never}
              className="flex items-center gap-4 bg-white rounded-2xl p-4 hover:bg-[#F7F8FA] active:bg-[#E6F0FE] transition-all group border border-[#EFF1F5]"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div className="w-11 h-11 rounded-2xl bg-[#E6F0FE] flex items-center justify-center text-[#0669F7] shrink-0 group-hover:bg-[#0669F7] group-hover:text-white transition-colors">
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#25282A]">{card.title}</p>
                  {card.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full leading-none ${
                        card.badgeUrgent
                          ? 'bg-[#FFF3CD] text-[#856404]'
                          : 'bg-[#E6F0FE] text-[#0669F7]'
                      }`}
                    >
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#98A2B2] mt-0.5">{card.desc}</p>
              </div>
              <svg className="w-4 h-4 text-[#DBDFE9] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        {/* New site CTA */}
        <div className="mt-4 p-4 rounded-2xl border-2 border-dashed border-[#DBDFE9] text-center hover:border-[#0669F7] hover:bg-[#E6F0FE] active:bg-[#E6F0FE] transition-colors">
          <Link href={`/${locale}/manager/sites/new` as never} className="block">
            <p className="text-sm font-bold text-[#25282A]">+ 새 현장 등록</p>
            <p className="text-xs text-[#98A2B2] mt-0.5">새로운 건설 현장을 등록하고 공고를 올리세요</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
