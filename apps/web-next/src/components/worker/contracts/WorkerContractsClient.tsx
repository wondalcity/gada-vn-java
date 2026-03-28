'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'

interface ContractListItem {
  id: string
  status: 'PENDING_WORKER_SIGN' | 'PENDING_MANAGER_SIGN' | 'FULLY_SIGNED' | 'VOID'
  job_title: string
  site_name: string
  work_date: string
  daily_wage: number
  worker_name?: string
  manager_name?: string
  worker_signed_at: string | null
  created_at: string
}

const STATUS_CONFIG = {
  PENDING_WORKER_SIGN:  { label: '서명 필요',    bg: 'bg-amber-100 text-amber-700',  dot: '#F59E0B' },
  PENDING_MANAGER_SIGN: { label: '사업주 서명 대기', bg: 'bg-blue-100 text-blue-700',    dot: '#0669F7' },
  FULLY_SIGNED:         { label: '계약 완료',    bg: 'bg-green-100 text-green-700',  dot: '#16A34A' },
  VOID:                 { label: '계약 무효',    bg: 'bg-gray-100 text-gray-500',    dot: '#9CA3AF' },
} as const

const DEMO_CONTRACTS: ContractListItem[] = [
  {
    id: 'demo-ctr-1',
    status: 'PENDING_WORKER_SIGN',
    job_title: '전기 배선 작업',
    site_name: '롯데몰 하노이 지하 1층 공사',
    work_date: '2026-03-28',
    daily_wage: 700000,
    manager_name: 'Kim Soo-jin',
    worker_signed_at: null,
    created_at: '2026-03-22T10:00:00Z',
  },
  {
    id: 'demo-ctr-2',
    status: 'FULLY_SIGNED',
    job_title: '철근 조립 — 3층 골조',
    site_name: '광명역 복합쇼핑몰 신축',
    work_date: '2026-03-25',
    daily_wage: 620000,
    manager_name: 'Lee Yeon-soo',
    worker_signed_at: '2026-03-16T14:00:00Z',
    created_at: '2026-03-15T08:00:00Z',
  },
  {
    id: 'demo-ctr-3',
    status: 'PENDING_MANAGER_SIGN',
    job_title: '잡부 — 자재 운반',
    site_name: '인천 송도 물류센터',
    work_date: '2026-03-30',
    daily_wage: 410000,
    manager_name: 'Park Joon-ho',
    worker_signed_at: '2026-03-25T11:00:00Z',
    created_at: '2026-03-24T09:00:00Z',
  },
]

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

function fmtVND(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + ' VND'
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-sm border border-[#DDDDDD] p-4 animate-pulse space-y-2">
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="h-3 bg-gray-200 rounded w-1/3" />
      <div className="flex gap-2 mt-3">
        <div className="h-6 bg-gray-200 rounded-full w-20" />
        <div className="h-6 bg-gray-200 rounded-full w-24" />
      </div>
    </div>
  )
}

export default function WorkerContractsClient() {
  const idToken = getSessionCookie()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'
  const [contracts, setContracts] = React.useState<ContractListItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    if (!idToken) { setIsLoading(false); return }
    setIsLoading(true); setError(null)
    apiClient<ContractListItem[]>('/contracts/mine-as-worker', { token: idToken })
      .then(({ data }) => setContracts(data))
      .catch(() => setContracts([]))  // fall back to demo on error
      .finally(() => setIsLoading(false))
  }, [idToken])

  React.useEffect(() => { load() }, [load])

  if (isLoading) {
    return (
      <div className="max-w-2xl md:max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">계약서</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl md:max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">계약서</h1>
        <p className="text-[#ED1C24] text-sm mb-4">{error}</p>
        <button type="button" onClick={load} className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm">다시 시도</button>
      </div>
    )
  }

  const isDemo = contracts.length === 0
  const displayContracts = isDemo ? DEMO_CONTRACTS : contracts
  const pendingCount = displayContracts.filter(c => c.status === 'PENDING_WORKER_SIGN').length

  return (
    <div className="max-w-2xl md:max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[#25282A]">계약서</h1>
          {isDemo && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
              데모 데이터
            </span>
          )}
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            서명 필요 {pendingCount}건
          </span>
        )}
      </div>

      {displayContracts.length === 0 ? (
        <div className="py-20 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 64 64" stroke="currentColor" strokeWidth={1.5}>
            <rect x="12" y="8" width="40" height="48" rx="3" />
            <line x1="20" y1="22" x2="44" y2="22" />
            <line x1="20" y1="30" x2="44" y2="30" />
            <line x1="20" y1="38" x2="36" y2="38" />
          </svg>
          <p className="text-[#7A7B7A] text-sm font-medium">계약서가 없습니다.</p>
          <p className="text-[#7A7B7A] text-xs mt-1">합격 후 계약서가 생성되면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayContracts.map((c) => {
            const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.VOID
            const needsSign = c.status === 'PENDING_WORKER_SIGN'
            return (
              <div
                key={c.id}
                className={`bg-white rounded-sm border p-4 ${needsSign ? 'border-amber-300 ring-1 ring-amber-200' : 'border-[#DDDDDD]'}`}
              >
                {/* Status + Title row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#25282A] text-sm truncate">{c.job_title}</p>
                    <p className="text-xs text-[#7A7B7A] mt-0.5 truncate">{c.site_name}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                    {st.label}
                  </span>
                </div>

                {/* Details */}
                <div className="border-t border-[#F2F2F2] pt-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-[#7A7B7A]">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {fmtDate(c.work_date)}
                  </div>
                  <div className="flex items-center gap-2 text-[#0669F7] font-semibold">
                    <svg className="w-3.5 h-3.5 shrink-0 text-[#7A7B7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {fmtVND(c.daily_wage)}
                  </div>
                  {c.manager_name && (
                    <div className="flex items-center gap-2 text-[#7A7B7A]">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      사업주: {c.manager_name}
                    </div>
                  )}
                </div>

                {/* Signature progress */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#F2F2F2]">
                  <div className="flex items-center gap-1 text-xs">
                    {c.status === 'FULLY_SIGNED' || c.status === 'PENDING_MANAGER_SIGN' ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /></svg>
                    )}
                    <span className={c.worker_signed_at ? 'text-green-600 font-medium' : 'text-[#B2B2B2]'}>근로자</span>
                  </div>
                  <svg className="w-3 h-3 text-[#DDDDDD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  <div className="flex items-center gap-1 text-xs">
                    {c.status === 'FULLY_SIGNED' ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /></svg>
                    )}
                    <span className={c.status === 'FULLY_SIGNED' ? 'text-green-600 font-medium' : 'text-[#B2B2B2]'}>사업주</span>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-3">
                  <Link
                    href={`/${locale}/worker/contracts/${c.id}`}
                    className={`block w-full py-2 text-center rounded-full text-sm font-medium transition-colors ${
                      needsSign
                        ? 'bg-[#F59E0B] text-white hover:bg-amber-600'
                        : 'bg-[#0669F7] text-white hover:bg-blue-700'
                    }`}
                  >
                    {needsSign ? '✍️ 서명하기' : '계약서 보기'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
