'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/types/contract'
import type { ContractStatus } from '@/types/contract'
import { formatDate } from '@/lib/utils/date'

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


function formatVND(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫'
}

function DocumentIllustration() {
  return (
    <svg
      className="w-16 h-16 text-[#DDDDDD] mx-auto mb-4"
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
              <div className="h-4 bg-[#DDDDDD] rounded w-1/2 mb-3" />
              <div className="h-3 bg-[#DDDDDD] rounded w-2/3 mb-2" />
              <div className="h-3 bg-[#DDDDDD] rounded w-1/3 mb-2" />
              <div className="h-6 bg-[#DDDDDD] rounded w-24 mt-3" />
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
        <p className="text-[#ED1C24] text-sm mb-4">{error}</p>
        <button
          type="button"
          onClick={load}
          className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium hover:bg-[#0557D4] transition-colors text-sm"
        >
          {t('manager_contracts.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-[1760px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-[#25282A]">{t('manager_contracts.title')}</h1>
      </div>

      {contracts.length === 0 ? (
        <div className="py-16 text-center">
          <DocumentIllustration />
          <p className="text-[#98A2B2] text-sm font-medium">{t('manager_contracts.empty_title')}</p>
          <p className="text-[#98A2B2] text-xs mt-1">{t('manager_contracts.empty_subtitle')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contracts.map((contract) => (
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
                <p>{formatDate(contract.work_date, locale)}</p>
                <p className="text-base font-bold text-[#0669F7] mt-1">{formatVND(contract.daily_wage)}</p>
              </div>

              {/* Link to detail */}
              <div className="mt-3 pt-3 border-t border-[#EFF1F5]">
                <Link
                  href={`/manager/contracts/${contract.id}`}
                  className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#0669F7] text-white font-medium text-xs hover:bg-[#0557D4] transition-colors"
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
