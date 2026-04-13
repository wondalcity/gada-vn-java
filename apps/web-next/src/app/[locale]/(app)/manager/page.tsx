'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { getSessionCookie, clearSessionCookie } from '@/lib/auth/session'

const API_BASE = '/api/v1'

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

// SVG icon set — no emoji
function IconSite() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}
function IconJob() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}
function IconHires() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function IconContract() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
function IconPlus() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
function IconWorker() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function IconChevron() {
  return (
    <svg className="w-4 h-4 text-[#98A2B2] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
function IconListings() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

export default function ManagerHomePage({ params }: Props) {
  const router = useRouter()
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
      }).then(r => r.json()).then(body => setStats(body.data)).catch(() => {}),
      fetch(`${API_BASE}/managers/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      }).then(r => r.json()).then(body => setManagerInfo(body.data)).catch(() => {}),
    ])
  }, [idToken])

  const ZERO_STATS: Stats = { activeSites: 0, openJobs: 0, pendingApplications: 0 }
  const displayStats = stats ?? ZERO_STATS

  const displayName = managerInfo?.representative_name ?? managerInfo?.company_name ?? '관리자'
  const initial = displayName.charAt(0).toUpperCase()

  const statCards = [
    {
      label: '운영중 현장', value: displayStats.activeSites,
      href: '/manager/sites', color: '#0669F7', bg: '#E6F0FE', border: '#A8C7FD',
      Icon: IconSite,
    },
    {
      label: '모집중 공고', value: displayStats.openJobs,
      href: '/manager/jobs', color: '#1A6B1A', bg: '#E6F9E6', border: '#86D98A',
      Icon: IconJob,
    },
    {
      label: '검토 대기', value: displayStats.pendingApplications,
      href: '/manager/hires', color: '#92620A', bg: '#FFF8E6', border: '#F5D87D',
      Icon: IconHires,
    },
  ]

  const quickActions = [
    { href: '/manager/sites/new', Icon: IconSite,     label: '현장등록' },
    { href: '/manager/jobs',      Icon: IconJob,      label: '공고관리' },
    { href: '/manager/hires',     Icon: IconHires,    label: '채용관리' },
    { href: '/manager/contracts', Icon: IconContract, label: '계약서' },
  ]

  const menuCards = [
    {
      href: '/manager/sites', Icon: IconSite, title: '현장 관리', desc: '건설 현장 등록 및 이미지 관리',
      badge: displayStats.activeSites > 0 ? `${displayStats.activeSites}개` : null, badgeUrgent: false,
    },
    {
      href: '/manager/jobs', Icon: IconJob, title: '공고 관리', desc: '일자리 공고 등록·수정·마감',
      badge: displayStats.openJobs > 0 ? `모집중 ${displayStats.openJobs}` : null, badgeUrgent: false,
    },
    {
      href: '/manager/hires', Icon: IconHires, title: '채용 관리', desc: '지원자 검토 및 합격 처리',
      badge: displayStats.pendingApplications > 0 ? `대기 ${displayStats.pendingApplications}` : null,
      badgeUrgent: displayStats.pendingApplications > 0,
    },
    {
      href: '/manager/contracts', Icon: IconContract, title: '계약서 관리', desc: '전자계약 및 서명 현황',
      badge: null, badgeUrgent: false,
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <div className="max-w-[1760px] mx-auto px-4 pt-4 pb-6 md:pt-8 md:pb-10">

        {/* ── MOBILE: manager hero card ───────────────────── */}
        <div className="md:hidden mb-4">
          <div className="rounded-3xl p-5 bg-[#0669F7] relative overflow-hidden">
            {/* Subtle geometric decoration */}
            <div className="absolute right-0 top-0 w-36 h-36 rounded-full bg-white/[0.06] -translate-y-1/3 translate-x-1/4 pointer-events-none" />
            <div className="absolute right-8 bottom-0 w-24 h-24 rounded-full bg-white/[0.06] translate-y-1/2 pointer-events-none" />

            {/* Profile row */}
            <div className="relative flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-lg font-bold shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-base text-white leading-tight truncate">{displayName}</p>
                  <Link href={'/manager/settings' as never} className="text-white/60 hover:text-white/90 transition-colors flex-shrink-0" aria-label="설정">
                    <IconSettings />
                  </Link>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFC72C] text-[#3C2C02] leading-none">
                    관리자
                  </span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="relative grid grid-cols-3 gap-2 border-t border-white/20 pt-4">
              {statCards.map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-extrabold text-white leading-none">{value}</p>
                  <p className="text-white/70 text-xs mt-1 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick action grid — SVG icons */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {quickActions.map(({ href, Icon, label }) => (
              <Link
                key={href}
                href={href as never}
                className="flex flex-col items-center gap-1.5 bg-white rounded-2xl py-3.5 border border-[#EFF1F5] shadow-sm active:bg-[#E6F0FE] transition-colors press-effect"
              >
                <span className="text-[#0669F7]"><Icon /></span>
                <span className="text-[11px] font-medium text-[#4B5563] leading-tight text-center">{label}</span>
              </Link>
            ))}
          </div>

          {/* Switch to worker view */}
          <Link
            href={'/worker' as never}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white border border-[#EFF1F5] text-[#4B5563] text-sm font-medium shadow-sm hover:border-[#0669F7] hover:text-[#0669F7] hover:bg-[#E6F0FE] transition-colors min-h-[44px]"
          >
            <IconWorker />
            근로자 화면으로 전환
          </Link>
        </div>

        {/* ── DESKTOP: page header + stat cards ──────────── */}
        <div className="hidden md:block mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-[#25282A]">관리자 홈</h1>
              <p className="text-sm text-[#98A2B2] mt-0.5">건설 현장과 일자리를 관리하세요</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={'/worker' as never}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#DDDDDD] bg-white text-[#25282A] text-sm font-medium hover:border-[#0669F7] hover:text-[#0669F7] hover:bg-[#E6F0FE] transition-colors min-h-[44px]"
              >
                <IconWorker />
                근로자 화면으로 전환
              </Link>
              <Link
                href={'/manager/sites/new' as never}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0669F7] text-white text-sm font-bold hover:bg-[#0557D4] transition-colors min-h-[44px] focus-ring"
              >
                <IconPlus />
                새 현장 등록
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {statCards.map(({ label, value, href, color, bg, border, Icon }) => (
              <Link
                key={label}
                href={href as never}
                className="rounded-3xl px-5 py-4 flex items-center justify-between press-effect"
                style={{ backgroundColor: bg, border: `1px solid ${border}` }}
              >
                <div>
                  <p className="text-xs font-medium" style={{ color }}>{label}</p>
                  <p className="text-3xl font-extrabold mt-0.5" style={{ color }}>{value}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center opacity-25" style={{ backgroundColor: color, color: '#fff' }}>
                  <Icon />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Listings shortcut — flat, no gradient ───────── */}
        <Link
          href={'/manager/my-listings' as never}
          className="flex items-center gap-3 mb-4 md:mb-6 p-4 rounded-2xl bg-[#0669F7] text-white hover:bg-[#0557D4] transition-colors active:opacity-90 press-effect border border-[#0448B0]"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <IconListings />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">내 현장·공고 보기</p>
            <p className="text-xs text-white/75 mt-0.5">근로자 화면으로 내 공고·현장을 확인하세요</p>
          </div>
          <svg className="w-4 h-4 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* ── Menu cards ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {menuCards.map((card) => (
            <Link
              key={card.href}
              href={card.href as never}
              className="flex items-center gap-4 bg-white rounded-2xl p-4 hover:bg-[#F7F8FA] active:bg-[#E6F0FE] transition-colors border border-[#EFF1F5] press-effect"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div className="w-11 h-11 rounded-2xl bg-[#E6F0FE] flex items-center justify-center text-[#0669F7] shrink-0 group-hover:bg-[#0669F7] group-hover:text-white transition-colors">
                <card.Icon />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-[#25282A]">{card.title}</p>
                  {card.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full leading-none border ${
                      card.badgeUrgent ? 'status-pending' : 'bg-[#E6F0FE] text-[#0669F7] border-[#A8C7FD]'
                    }`}>
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#98A2B2] mt-0.5">{card.desc}</p>
              </div>
              <IconChevron />
            </Link>
          ))}
        </div>

        {/* New Job CTA — primary repeated action */}
        <Link
          href={'/manager/jobs?new=1' as never}
          className="flex items-center justify-center gap-3 mt-4 p-4 rounded-2xl bg-[#0669F7] hover:bg-[#0557D4] active:bg-[#0448B0] transition-colors shadow-md"
          style={{ minHeight: 64 }}
        >
          <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </span>
          <div className="text-left">
            <p className="text-sm font-bold text-white">새 공고 등록</p>
            <p className="text-xs text-white/75 mt-0.5">현장을 선택하고 새 일자리를 올리세요</p>
          </div>
          <svg className="w-4 h-4 text-white/60 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
