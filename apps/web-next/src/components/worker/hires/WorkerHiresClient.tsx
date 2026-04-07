'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
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
    contractId: 'demo-ctr-1',
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
  const t = useTranslations('common')
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
      <div className="py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('worker_hires.title')}</h1>
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
      <div className="py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('worker_hires.title')}</h1>
        <p className="text-[#ED1C24] text-sm">{error}</p>
      </div>
    )
  }

  const isDemo = hires.length === 0
  const displayHires = isDemo ? DEMO_HIRES : hires

  return (
    <div className="pb-10">
      <div className="py-6 flex items-center gap-3">
        <h1 className="text-xl font-bold text-[#25282A]">{t('worker_hires.title')}</h1>
        {isDemo && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            {t('demo_data')}
          </span>
        )}
      </div>

      {displayHires.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-[#EFF1F5] shadow-sm">
          <BuildingIllustration />
          <p className="text-[#98A2B2] text-sm font-medium">{t('worker_hires.empty')}</p>
          <p className="text-[#98A2B2] text-xs mt-1">{t('worker_hires.empty_subtitle')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayHires.map(hire => (
            <div key={hire.id} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 relative">
              {/* Accepted badge */}
              <span className="absolute top-4 right-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                {t('worker_hires.badge_accepted')}
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
                <p className="text-xs text-[#98A2B2] mt-1">{t('worker_hires.manager_label', { name: hire.managerName })}</p>
              )}

              {/* Contract link + attendance link */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {hire.contractId && (
                  <Link
                    href={`/worker/contracts/${hire.contractId}`}
                    className="px-4 py-2 rounded-full bg-[#0669F7] text-white font-medium text-xs"
                  >
                    {t('worker_hires.view_contract')}
                  </Link>
                )}
                <Link
                  href={`/worker/attendance?jobId=${hire.jobId}`}
                  className="px-4 py-2 rounded-full border border-[#EFF1F5] text-[#98A2B2] font-medium text-xs hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
                >
                  {t('worker_hires.view_attendance')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 pt-4 border-t border-[#EFF1F5]">
        <p className="text-xs text-[#98A2B2] text-center">{t('worker_hires.total_count', { count: displayHires.length })}</p>
      </div>
    </div>
  )
}
