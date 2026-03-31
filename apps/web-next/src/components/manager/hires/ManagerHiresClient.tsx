'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import type { HireWithContract } from '@/types/contract'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/types/contract'

const DEMO_HIRES: HireWithContract[] = [
  {
    id: 'hire-1',
    jobId: 'djob-1',
    jobTitle: '전기 배선 작업',
    siteName: '롯데몰 하노이 지하 1층 공사',
    workDate: '2026-03-28',
    dailyWage: 700000,
    workerName: 'Nguyễn Văn An',
    workerPhone: '0901234567',
    status: 'CONTRACTED',
    reviewedAt: '2026-03-22T10:00:00Z',
    contract: {
      id: 'ctr-1',
      status: 'FULLY_SIGNED',
      workerSignedAt: '2026-03-23T14:00:00Z',
      managerSignedAt: '2026-03-22T10:00:00Z',
      downloadUrl: null,
    },
  },
  {
    id: 'hire-2',
    jobId: 'djob-1',
    jobTitle: '전기 배선 작업',
    siteName: '롯데몰 하노이 지하 1층 공사',
    workDate: '2026-03-28',
    dailyWage: 700000,
    workerName: 'Trần Thị Bích',
    workerPhone: '0912345678',
    status: 'CONTRACTED',
    reviewedAt: '2026-03-22T11:00:00Z',
    contract: {
      id: 'ctr-2',
      status: 'PENDING_MANAGER_SIGN',
      workerSignedAt: '2026-03-23T16:00:00Z',
      managerSignedAt: null,
      downloadUrl: null,
    },
  },
  {
    id: 'hire-3',
    jobId: 'djob-3',
    jobTitle: '잡부 — 자재 운반',
    siteName: '인천 송도 물류센터',
    workDate: '2026-03-30',
    dailyWage: 410000,
    workerName: 'Lê Minh Tuấn',
    workerPhone: '0923456789',
    status: 'ACCEPTED',
    reviewedAt: '2026-03-24T09:00:00Z',
    contract: null,
  },
  {
    id: 'hire-4',
    jobId: 'djob-3',
    jobTitle: '잡부 — 자재 운반',
    siteName: '인천 송도 물류센터',
    workDate: '2026-03-30',
    dailyWage: 410000,
    workerName: 'Phạm Thị Hoa',
    workerPhone: '0934567890',
    status: 'ACCEPTED',
    reviewedAt: '2026-03-24T10:00:00Z',
    contract: null,
  },
  {
    id: 'hire-5',
    jobId: 'djob-5',
    jobTitle: '타일 시공 — 로비 바닥',
    siteName: '광명역 복합쇼핑몰 신축',
    workDate: '2026-04-01',
    dailyWage: 580000,
    workerName: 'Võ Văn Hùng',
    workerPhone: '0945678901',
    status: 'ACCEPTED',
    reviewedAt: '2026-03-25T08:00:00Z',
    contract: null,
  },
  {
    id: 'hire-6',
    jobId: 'djob-5',
    jobTitle: '타일 시공 — 로비 바닥',
    siteName: '광명역 복합쇼핑몰 신축',
    workDate: '2026-04-01',
    dailyWage: 580000,
    workerName: 'Đặng Thị Mai',
    workerPhone: '0956789012',
    status: 'CONTRACTED',
    reviewedAt: '2026-03-25T09:00:00Z',
    contract: {
      id: 'ctr-3',
      status: 'PENDING_WORKER_SIGN',
      workerSignedAt: null,
      managerSignedAt: null,
      downloadUrl: null,
    },
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

function PeopleIllustration() {
  return (
    <svg
      className="w-16 h-16 text-gray-300 mx-auto mb-4"
      fill="none"
      viewBox="0 0 64 64"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="22" cy="20" r="8" />
      <path d="M6 52c0-8.837 7.163-16 16-16s16 7.163 16 16" />
      <circle cx="44" cy="22" r="6" />
      <path d="M32 52c0-6.627 5.373-12 12-12" />
    </svg>
  )
}

export default function ManagerHiresClient() {
  const idToken = getSessionCookie()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'
  const [hires, setHires] = React.useState<HireWithContract[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [creatingContractFor, setCreatingContractFor] = React.useState<string | null>(null)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    if (!idToken) { setIsLoading(false); return }
    setIsLoading(true)
    apiClient<Record<string, any>[]>('/applications/for-manager', { token: idToken })
      .then(({ data }) => {
        const mapped: HireWithContract[] = data
          .filter((a) => a.status === 'ACCEPTED' || a.status === 'CONTRACTED')
          .map((a) => ({
            id: a.id,
            jobId: a.job_id,
            jobTitle: a.job_title ?? '',
            siteName: a.site_name ?? '',
            workDate: a.work_date ?? '',
            dailyWage: a.daily_wage ?? 0,
            workerName: a.worker_name ?? '',
            workerPhone: a.worker_phone ?? '',
            status: a.status,
            reviewedAt: a.reviewed_at ?? null,
            contract: a.contract_id ? {
              id: a.contract_id,
              status: a.contract_status,
              workerSignedAt: a.worker_signed_at ?? null,
              managerSignedAt: a.manager_signed_at ?? null,
              downloadUrl: null,
            } : null,
          }))
        setHires(mapped)
      })
      .catch(() => setHires(DEMO_HIRES))
      .finally(() => setIsLoading(false))
  }, [idToken])

  React.useEffect(() => {
    load()
  }, [load])

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  async function handleCreateContract(hireId: string) {
    if (!idToken) return
    setCreatingContractFor(hireId)
    try {
      await apiClient(`/contracts/generate`, {
        method: 'POST',
        token: idToken,
        body: JSON.stringify({ applicationId: hireId }),
      })
      showToast('계약서가 생성되었습니다.')
      load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '계약서 생성 중 오류가 발생했습니다.'
      showToast(msg)
    } finally {
      setCreatingContractFor(null)
    }
  }

  const isDemo = hires.length === 0
  const displayHires = isDemo ? DEMO_HIRES : hires

  const filteredHires = React.useMemo(() => {
    if (!searchQuery.trim()) return displayHires
    const q = searchQuery.toLowerCase()
    return displayHires.filter(
      (h) =>
        h.workerName.toLowerCase().includes(q) ||
        h.workerPhone.includes(q),
    )
  }, [displayHires, searchQuery])

  const contractedCount = displayHires.filter((h) => h.status === 'CONTRACTED').length

  if (isLoading) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">합격자 관리</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-28 mt-3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1760px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-xl font-bold text-[#25282A]">합격자 관리</h1>
        {isDemo && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            데모 데이터
          </span>
        )}
      </div>

      {/* Summary stats */}
      {displayHires.length > 0 && (
        <div className="flex gap-4 mb-4">
          <div className="flex-1 bg-blue-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-[#0669F7]">{displayHires.length}</p>
            <p className="text-xs text-[#98A2B2] mt-0.5">전체 합격자</p>
          </div>
          <div className="flex-1 bg-green-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{contractedCount}</p>
            <p className="text-xs text-[#98A2B2] mt-0.5">계약 완료</p>
          </div>
        </div>
      )}

      {/* Search */}
      {displayHires.length > 0 && (
        <div className="mb-4">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="근로자 이름 또는 전화번호 검색"
            className="w-full px-3 py-2.5 border border-[#EFF1F5] rounded-2xl text-sm text-[#25282A] placeholder-[#98A2B2] focus:outline-none focus:border-[#0669F7]"
          />
        </div>
      )}

      {displayHires.length === 0 ? (
        <div className="py-16 text-center">
          <PeopleIllustration />
          <p className="text-[#98A2B2] text-sm font-medium">합격자가 없습니다.</p>
          <p className="text-[#98A2B2] text-xs mt-1">지원자를 합격 처리하면 여기에 표시됩니다.</p>
        </div>
      ) : filteredHires.length === 0 ? (
        <p className="text-center text-[#98A2B2] text-sm py-12">검색 결과가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredHires.map((hire) => (
            <div
              key={hire.id}
              className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4"
            >
              {/* Worker info */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <Link
                    href={`/${locale}/manager/hires/${hire.id}`}
                    className="font-semibold text-[#25282A] text-sm hover:text-[#0669F7] transition-colors"
                  >
                    {hire.workerName}
                  </Link>
                  <p className="text-xs text-[#98A2B2] mt-0.5">{hire.workerPhone}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    hire.status === 'CONTRACTED'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {hire.status === 'CONTRACTED' ? '계약완료' : '합격'}
                </span>
              </div>

              {/* Job info */}
              <div className="border-t border-[#EFF1F5] pt-2 space-y-1 text-xs text-[#98A2B2]">
                <p className="text-[#25282A] font-medium text-sm">{hire.jobTitle}</p>
                <p>{hire.siteName}</p>
                <p>{formatDate(hire.workDate)}</p>
                <p className="text-base font-bold text-[#0669F7] mt-1">{formatVND(hire.dailyWage)}</p>
              </div>

              {/* Contract section */}
              <div className="mt-3 pt-3 border-t border-[#EFF1F5]">
                {hire.contract ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        CONTRACT_STATUS_COLORS[hire.contract.status]
                      }`}
                    >
                      {CONTRACT_STATUS_LABELS[hire.contract.status]}
                    </span>
                    <Link
                      href={`/${locale}/manager/contracts/${hire.contract.id}`}
                      className="px-4 py-1.5 rounded-full bg-[#0669F7] text-white font-medium text-xs hover:bg-blue-700 transition-colors"
                    >
                      계약서 보기
                    </Link>
                    {hire.contract.status === 'FULLY_SIGNED' && hire.contract.downloadUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(hire.contract!.downloadUrl!, '_blank')}
                        className="px-4 py-1.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-xs hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
                      >
                        다운로드
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCreateContract(hire.id)}
                    disabled={creatingContractFor === hire.id}
                    className="px-4 py-1.5 rounded-full border border-[#0669F7] text-[#0669F7] font-medium text-xs hover:bg-[#0669F7] hover:text-white transition-colors disabled:opacity-40"
                  >
                    {creatingContractFor === hire.id ? '생성 중...' : '계약서 생성'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#25282A] text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
