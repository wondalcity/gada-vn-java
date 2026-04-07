'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { useParams } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'

interface ContractListItem {
  id: string
  status: 'PENDING_WORKER_SIGN' | 'PENDING_MANAGER_SIGN' | 'FULLY_SIGNED' | 'VOID'
  jobTitle: string
  siteName: string
  workDate: string
  dailyWage: number
  managerName?: string
  workerSignedAt: string | null
  createdAt: string
}

const STATUS_CONFIG = {
  PENDING_WORKER_SIGN:  { label: '서명 필요',       bg: 'bg-[#FFF8E6] text-[#856404] border-[#F5D87D]',  dot: '#F59E0B' },
  PENDING_MANAGER_SIGN: { label: '사업주 서명 대기', bg: 'bg-[#E6F0FE] text-[#0669F7] border-[#B3D9FF]',     dot: '#0669F7' },
  FULLY_SIGNED:         { label: '계약 완료',        bg: 'bg-[#E6F9E6] text-[#1A6B1A] border-[#86D98A]',  dot: '#16A34A' },
  VOID:                 { label: '계약 무효',        bg: 'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]',    dot: '#9CA3AF' },
} as const

const DEMO_CONTRACTS: ContractListItem[] = [
  {
    id: 'demo-ctr-1',
    status: 'PENDING_WORKER_SIGN',
    jobTitle: '전기 배선 작업',
    siteName: '롯데몰 하노이 지하 1층 공사',
    workDate: '2026-03-28',
    dailyWage: 700000,
    managerName: 'Kim Soo-jin',
    workerSignedAt: null,
    createdAt: '2026-03-22T10:00:00Z',
  },
  {
    id: 'demo-ctr-2',
    status: 'FULLY_SIGNED',
    jobTitle: '철근 조립 — 3층 골조',
    siteName: '광명역 복합쇼핑몰 신축',
    workDate: '2026-03-25',
    dailyWage: 620000,
    managerName: 'Lee Yeon-soo',
    workerSignedAt: '2026-03-16T14:00:00Z',
    createdAt: '2026-03-15T08:00:00Z',
  },
  {
    id: 'demo-ctr-3',
    status: 'PENDING_MANAGER_SIGN',
    jobTitle: '잡부 — 자재 운반',
    siteName: '인천 송도 물류센터',
    workDate: '2026-03-30',
    dailyWage: 410000,
    managerName: 'Park Joon-ho',
    workerSignedAt: '2026-03-25T11:00:00Z',
    createdAt: '2026-03-24T09:00:00Z',
  },
]

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

function fmtVND(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫'
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
    apiClient<ContractListItem[]>('/contracts/mine', { token: idToken })
      .then(({ data }) => setContracts(data))
      .catch(() => setContracts([]))
      .finally(() => setIsLoading(false))
  }, [idToken])

  React.useEffect(() => { load() }, [load])

  if (isLoading) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">계약서</h1>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#EFF1F5] p-4 animate-pulse shadow-sm">
              <div className="h-4 bg-[#DDDDDD] rounded w-2/3 mb-3" />
              <div className="h-3 bg-[#DDDDDD] rounded w-1/2 mb-2" />
              <div className="h-3 bg-[#DDDDDD] rounded w-1/3" />
              <div className="flex gap-2 mt-3">
                <div className="h-6 bg-[#DDDDDD] rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">계약서</h1>
        <p className="text-[#ED1C24] text-sm mb-4">{error}</p>
        <button type="button" onClick={load} className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium hover:bg-[#0557D4] transition-colors text-sm">다시 시도</button>
      </div>
    )
  }

  const isDemo = contracts.length === 0
  const displayContracts = isDemo ? DEMO_CONTRACTS : contracts
  const pendingCount = displayContracts.filter(c => c.status === 'PENDING_WORKER_SIGN').length

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[#25282A]">계약서</h1>
          {isDemo && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FFE9B0] text-[#856404] border border-[#F5D87D]">
              데모 데이터
            </span>
          )}
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFE9B0] text-[#856404] border border-[#F5D87D]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC72C]" />
            서명 필요 {pendingCount}건
          </span>
        )}
      </div>

      {displayContracts.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-[#EFF1F5]">
          <div className="w-14 h-14 rounded-full bg-[#EFF1F5] flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#98A2B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[#25282A] font-semibold text-sm">계약서가 없습니다</p>
          <p className="text-[#98A2B2] text-xs mt-1">합격 후 계약서가 생성되면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayContracts.map((c) => {
            const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.VOID
            const needsSign = c.status === 'PENDING_WORKER_SIGN'
            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm transition-colors ${
                  needsSign ? 'border-[#F5D87D] ring-1 ring-amber-100' : 'border-[#EFF1F5]'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#25282A] text-sm truncate">{c.jobTitle}</p>
                    <p className="text-xs text-[#98A2B2] mt-0.5 truncate">{c.siteName}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${st.bg}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                    {st.label}
                  </span>
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#98A2B2] border-t border-[#F2F4F5] pt-3">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {fmtDate(c.workDate)}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-[#0669F7]">
                    {fmtVND(c.dailyWage)}
                  </span>
                  {c.managerName && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {c.managerName}
                    </span>
                  )}
                </div>

                {/* Signature progress */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F2F4F5] text-xs">
                  <span className={`flex items-center gap-1 ${c.workerSignedAt ? 'text-[#1A6B1A] font-semibold' : 'text-[#B2B2B2]'}`}>
                    {c.workerSignedAt ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /></svg>
                    )}
                    근로자 서명
                  </span>
                  <svg className="w-3 h-3 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  <span className={`flex items-center gap-1 ${c.status === 'FULLY_SIGNED' ? 'text-[#1A6B1A] font-semibold' : 'text-[#B2B2B2]'}`}>
                    {c.status === 'FULLY_SIGNED' ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /></svg>
                    )}
                    사업주 서명
                  </span>
                </div>

                {/* Action button */}
                <div className="mt-3">
                  <Link
                    href={`/worker/contracts/${c.id}` as never}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-semibold transition-colors ${
                      needsSign
                        ? 'bg-[#FFC72C] text-white hover:bg-[#D4A600]'
                        : 'bg-[#EEF5FF] text-[#0669F7] hover:bg-[#DDEAFF]'
                    }`}
                  >
                    {needsSign ? (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        서명하기
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        계약서 보기
                      </>
                    )}
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
