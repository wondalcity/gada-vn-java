'use client'

import * as React from 'react'
import Link from 'next/link'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import type { Hire } from '@/types/application'
import { useParams } from 'next/navigation'

// Extended Hire type that may include contractId from the backend
interface HireWithContractId extends Hire {
  contractId?: string
}

const DEMO_HIRES: HireWithContractId[] = [
  {
    id: 'demo-hire-1',
    jobId: 'djob-1',
    jobTitle: '전기 배선 작업',
    siteId: 'demo-1',
    siteName: '롯데몰 하노이 지하 1층 공사',
    workDate: '2026-03-28',
    startTime: '07:00',
    endTime: '17:00',
    dailyWage: 700000,
    status: 'CONTRACTED',
    appliedAt: '2026-03-20T08:00:00Z',
    reviewedAt: '2026-03-22T10:00:00Z',
    managerName: 'Kim Soo-jin',
    contractId: 'ctr-1',
  },
  {
    id: 'demo-hire-2',
    jobId: 'djob-3',
    jobTitle: '잡부 — 자재 운반',
    siteId: 'demo-2',
    siteName: '인천 송도 물류센터',
    workDate: '2026-03-30',
    startTime: '08:00',
    endTime: '17:00',
    dailyWage: 410000,
    status: 'ACCEPTED',
    appliedAt: '2026-03-22T09:00:00Z',
    reviewedAt: '2026-03-24T09:00:00Z',
    managerName: 'Park Joon-ho',
  },
  {
    id: 'demo-hire-3',
    jobId: 'djob-5',
    jobTitle: '타일 시공 — 로비 바닥',
    siteId: 'demo-3',
    siteName: '광명역 복합쇼핑몰 신축',
    workDate: '2026-04-01',
    startTime: '08:00',
    endTime: '17:00',
    dailyWage: 580000,
    status: 'ACCEPTED',
    appliedAt: '2026-03-24T10:00:00Z',
    reviewedAt: '2026-03-25T09:00:00Z',
    managerName: 'Lee Yeon-soo',
  },
]

function formatVND(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫'
}

function formatDate(d: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(d))
}

function BuildingIllustration() {
  return (
    <svg
      className="w-20 h-20 text-gray-300 mx-auto mb-4"
      fill="none"
      viewBox="0 0 64 64"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <rect x="8" y="20" width="48" height="36" rx="2" />
      <rect x="14" y="28" width="8" height="8" />
      <rect x="28" y="28" width="8" height="8" />
      <rect x="42" y="28" width="8" height="8" />
      <rect x="14" y="40" width="8" height="8" />
      <rect x="42" y="40" width="8" height="8" />
      <rect x="26" y="40" width="12" height="16" />
      <polyline points="4,20 32,4 60,20" />
    </svg>
  )
}

export default function WorkerHiresClient() {
  const idToken = getSessionCookie()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'
  const [hires, setHires] = React.useState<HireWithContractId[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!idToken) { setIsLoading(false); return }
    setIsLoading(true)
    apiClient<HireWithContractId[]>('/workers/hires', { token: idToken })
      .then(({ data }) => setHires(data))
      .catch(() => setHires([]))  // fall back to demo on error
      .finally(() => setIsLoading(false))
  }, [idToken])

  if (isLoading) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">합격 내역</h1>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">합격 내역</h1>
        <p className="text-[#D81A48] text-sm">{error}</p>
      </div>
    )
  }

  const isDemo = hires.length === 0
  const displayHires = isDemo ? DEMO_HIRES : hires

  return (
    <div className="max-w-[1760px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-[#25282A]">합격 내역</h1>
        {isDemo && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            데모 데이터
          </span>
        )}
      </div>

      {displayHires.length === 0 ? (
        <div className="py-16 text-center">
          <BuildingIllustration />
          <p className="text-[#98A2B2] text-sm font-medium">합격된 일자리가 없습니다</p>
          <p className="text-[#98A2B2] text-xs mt-1">지원한 공고에서 합격 소식을 기다려주세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayHires.map(hire => (
            <div key={hire.id} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 relative">
              {/* Accepted badge */}
              <span className="absolute top-4 right-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                합격
              </span>

              {/* Job title */}
              <p className="font-semibold text-[#25282A] text-sm pr-16">{hire.jobTitle}</p>

              {/* Work date & time */}
              <p className="text-xs text-[#98A2B2] mt-1">
                {formatDate(hire.workDate)}
                {hire.startTime && hire.endTime && ` · ${hire.startTime}–${hire.endTime}`}
              </p>

              {/* Site name */}
              <p className="text-xs text-[#98A2B2] mt-0.5">{hire.siteName}</p>

              {/* Daily wage */}
              <p className="text-xl font-bold text-[#0669F7] mt-2">{formatVND(hire.dailyWage)}</p>

              {/* Manager info */}
              {hire.managerName && (
                <p className="text-xs text-[#98A2B2] mt-1">담당자: {hire.managerName}</p>
              )}

              {/* Contract link + attendance link */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {hire.status === 'CONTRACTED' && (
                  <Link
                    href={`/${locale}/worker/contracts/${hire.contractId ?? hire.id}`}
                    className="px-4 py-2 rounded-full bg-[#0669F7] text-white font-medium text-xs"
                  >
                    계약서 보기
                  </Link>
                )}
                <Link
                  href={`/${locale}/worker/attendance?jobId=${hire.jobId}`}
                  className="px-4 py-2 rounded-full border border-[#EFF1F5] text-[#98A2B2] font-medium text-xs hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
                >
                  출근 현황 보기
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
