'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import type { Contract } from '@/types/contract'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/types/contract'
import { ContractDocument, ContractDownloadButton } from '@/components/contracts/ContractDocument'

interface Props { contractId: string }

export default function ManagerContractClient({ contractId }: Props) {
  const idToken = getSessionCookie()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'
  const documentRef = React.useRef<HTMLDivElement>(null)

  const [contract, setContract] = React.useState<Contract | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    if (!idToken) return
    setIsLoading(true); setError(null)
    apiClient<Contract>(`/contracts/${contractId}`, { token: idToken })
      .then(({ data }) => setContract(data))
      .catch(() => setError('계약서를 불러올 수 없습니다.'))
      .finally(() => setIsLoading(false))
  }, [contractId, idToken])

  React.useEffect(() => { load() }, [load])

  if (isLoading) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6 space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="bg-white rounded-2xl border border-[#EFF1F5] p-4 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" />)}
        </div>
        <div className="h-48 bg-gray-200 rounded" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6">
        <p className="text-[#D81A48] text-sm mb-4">{error ?? '계약서를 찾을 수 없습니다.'}</p>
        <button type="button" onClick={load} className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm">다시 시도</button>
      </div>
    )
  }

  const statusLabel = CONTRACT_STATUS_LABELS[contract.status]
  const statusColor = CONTRACT_STATUS_COLORS[contract.status]

  return (
    <div className="max-w-[1760px] mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/manager/contracts`} className="p-1.5 rounded-full hover:bg-[#F2F4F5] transition-colors text-[#98A2B2]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#25282A]">근로계약서</h1>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{statusLabel}</span>
        </div>
        <ContractDownloadButton documentRef={documentRef} contractId={contract.id} />
      </div>

      {/* Status banners */}
      {contract.status === 'PENDING_WORKER_SIGN' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <p className="text-sm font-medium text-amber-700">근로자 서명을 기다리고 있습니다.</p>
        </div>
      )}
      {contract.status === 'FULLY_SIGNED' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
          <p className="text-sm font-medium text-green-700">✅ 계약이 완료되었습니다. 오른쪽 상단의 버튼으로 이미지를 저장하세요.</p>
        </div>
      )}
      {contract.status === 'VOID' && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
          <p className="text-sm font-medium text-gray-500">이 계약은 무효 처리되었습니다.</p>
        </div>
      )}

      {/* Contract document */}
      <div className="overflow-x-auto rounded-2xl border border-[#EFF1F5] shadow-sm">
        <ContractDocument contract={contract} documentRef={documentRef} />
      </div>
    </div>
  )
}
