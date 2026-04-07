'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/types/contract'
import type { ContractStatus } from '@/types/contract'

interface ContractListItem {
  id: string
  status: ContractStatus
  job_title: string
  site_name: string
  work_date: string
  daily_wage: number
  worker_name: string
  worker_phone: string
  worker_signed_at: string | null
  created_at: string
}

const DEMO_CONTRACTS: ContractListItem[] = [
  {
    id: 'ctr-1',
    status: 'FULLY_SIGNED',
    job_title: '전기 배선 작업',
    site_name: '롯데몰 하노이 지하 1층 공사',
    work_date: '2026-03-28',
    daily_wage: 700000,
    worker_name: 'Nguyễn Văn An',
    worker_phone: '0901234567',
    worker_signed_at: '2026-03-23T14:00:00Z',
    created_at: '2026-03-22T10:00:00Z',
  },
  {
    id: 'ctr-2',
    status: 'PENDING_MANAGER_SIGN',
    job_title: '전기 배선 작업',
    site_name: '롯데몰 하노이 지하 1층 공사',
    work_date: '2026-03-28',
    daily_wage: 700000,
    worker_name: 'Trần Thị Bích',
    worker_phone: '0912345678',
    worker_signed_at: '2026-03-23T16:00:00Z',
    created_at: '2026-03-22T11:00:00Z',
  },
  {
    id: 'ctr-3',
    status: 'PENDING_WORKER_SIGN',
    job_title: '타일 시공 — 로비 바닥',
    site_name: '광명역 복합쇼핑몰 신축',
    work_date: '2026-04-01',
    daily_wage: 580000,
    worker_name: 'Đặng Thị Mai',
    worker_phone: '0956789012',
    worker_signed_at: null,
    created_at: '2026-03-25T09:00:00Z',
  },
  {
    id: 'ctr-4',
    status: 'FULLY_SIGNED',
    job_title: '잡부 — 자재 운반',
    site_name: '인천 송도 물류센터',
    work_date: '2026-03-27',
    daily_wage: 410000,
    worker_name: 'Hoàng Văn Đức',
    worker_phone: '0967890123',
    worker_signed_at: '2026-03-20T11:00:00Z',
    created_at: '2026-03-19T10:00:00Z',
  },
  {
    id: 'ctr-5',
    status: 'PENDING_WORKER_SIGN',
    job_title: '철근 조립 — 3층 골조',
    site_name: '광명역 복합쇼핑몰 신축',
    work_date: '2026-03-25',
    daily_wage: 620000,
    worker_name: 'Ngô Thị Lan',
    worker_phone: '0978901234',
    worker_signed_at: null,
    created_at: '2026-03-15T08:00:00Z',
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

function DocumentIllustration() {
  return (
    <svg
      className="w-16 h-16 text-gray-300 mx-auto mb-4"
      fill="none"
      viewBox="0 0 64 64"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <rect x="12" y="8" width="40" height="48" rx="3" />
      <line x1="20" y1="22" x2="44" y2="22" />
      <line x1="20" y1="30" x2="44" y2="30" />
      <line x1="20" y1="38" x2="36" y2="38" />
    </svg>
  )
}

export default function ManagerContractsClient() {
  const t = useTranslations('common')
  const idToken = getSessionCookie()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'
  const [contracts, setContracts] = React.useState<ContractListItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    if (!idToken) { setIsLoading(false); return }
    setIsLoading(true)
    setError(null)
    apiClient<ContractListItem[]>('/contracts/mine-as-manager', { token: idToken })
      .then(({ data }) => setContracts(data))
      .catch(() => setError(t('manager_contracts.error_load')))
      .finally(() => setIsLoading(false))
  }, [idToken])

  React.useEffect(() => {
    load()
  }, [load])

  if (isLoading) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('manager_contracts.title')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-24 mt-3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('manager_contracts.title')}</h1>
        <p className="text-[#D81A48] text-sm mb-4">{error}</p>
        <button
          type="button"
          onClick={load}
          className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm"
        >
          {t('manager_contracts.retry')}
        </button>
      </div>
    )
  }

  const isDemo = contracts.length === 0
  const displayContracts = isDemo ? DEMO_CONTRACTS : contracts

  return (
    <div className="max-w-[1760px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-[#25282A]">{t('manager_contracts.title')}</h1>
        {isDemo && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            {t('manager_contracts.demo_badge')}
          </span>
        )}
      </div>

      {displayContracts.length === 0 ? (
        <div className="py-16 text-center">
          <DocumentIllustration />
          <p className="text-[#98A2B2] text-sm font-medium">{t('manager_contracts.empty_title')}</p>
          <p className="text-[#98A2B2] text-xs mt-1">{t('manager_contracts.empty_subtitle')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayContracts.map((contract) => (
            <div
              key={contract.id}
              className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4"
            >
              {/* Worker + status */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-[#25282A] text-sm">{contract.worker_name}</p>
                  <p className="text-xs text-[#98A2B2] mt-0.5">{contract.worker_phone}</p>
                  <p className="text-xs text-[#B2B2B2] mt-0.5 font-mono tracking-wide">#{contract.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${CONTRACT_STATUS_COLORS[contract.status]}`}
                >
                  {CONTRACT_STATUS_LABELS[contract.status]}
                </span>
              </div>

              {/* Job info */}
              <div className="border-t border-[#EFF1F5] pt-2 space-y-1 text-xs text-[#98A2B2]">
                <p className="text-[#25282A] font-medium text-sm">{contract.job_title}</p>
                <p>{contract.site_name}</p>
                <p>{formatDate(contract.work_date)}</p>
                <p className="text-base font-bold text-[#0669F7] mt-1">{formatVND(contract.daily_wage)}</p>
              </div>

              {/* Link to detail */}
              <div className="mt-3 pt-3 border-t border-[#EFF1F5]">
                <Link
                  href={`/${locale}/manager/contracts/${contract.id}`}
                  className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#0669F7] text-white font-medium text-xs hover:bg-blue-700 transition-colors"
                >
                  {t('manager_contracts.view_contract')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
