'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import type { HireWithContract } from '@/types/contract'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/types/contract'

const DEMO_HIRES: Record<string, HireWithContract> = {
  'hire-1': { id: 'hire-1', jobId: 'djob-1', jobTitle: '전기 배선 작업', siteName: '롯데몰 하노이 지하 1층 공사', workDate: '2026-03-28', dailyWage: 700000, workerName: 'Nguyễn Văn An', workerPhone: '0901234567', status: 'CONTRACTED', reviewedAt: '2026-03-22T10:00:00Z', contract: { id: 'ctr-1', status: 'FULLY_SIGNED', workerSignedAt: '2026-03-23T14:00:00Z', managerSignedAt: '2026-03-22T10:00:00Z', downloadUrl: null } },
  'hire-2': { id: 'hire-2', jobId: 'djob-1', jobTitle: '전기 배선 작업', siteName: '롯데몰 하노이 지하 1층 공사', workDate: '2026-03-28', dailyWage: 700000, workerName: 'Trần Thị Bích', workerPhone: '0912345678', status: 'CONTRACTED', reviewedAt: '2026-03-22T11:00:00Z', contract: { id: 'ctr-2', status: 'PENDING_MANAGER_SIGN', workerSignedAt: '2026-03-23T16:00:00Z', managerSignedAt: null, downloadUrl: null } },
  'hire-3': { id: 'hire-3', jobId: 'djob-3', jobTitle: '잡부 — 자재 운반', siteName: '인천 송도 물류센터', workDate: '2026-03-30', dailyWage: 410000, workerName: 'Lê Minh Tuấn', workerPhone: '0923456789', status: 'ACCEPTED', reviewedAt: '2026-03-24T09:00:00Z', contract: null },
  'hire-4': { id: 'hire-4', jobId: 'djob-3', jobTitle: '잡부 — 자재 운반', siteName: '인천 송도 물류센터', workDate: '2026-03-30', dailyWage: 410000, workerName: 'Phạm Thị Hoa', workerPhone: '0934567890', status: 'ACCEPTED', reviewedAt: '2026-03-24T10:00:00Z', contract: null },
  'hire-5': { id: 'hire-5', jobId: 'djob-5', jobTitle: '타일 시공 — 로비 바닥', siteName: '광명역 복합쇼핑몰 신축', workDate: '2026-04-01', dailyWage: 580000, workerName: 'Võ Văn Hùng', workerPhone: '0945678901', status: 'ACCEPTED', reviewedAt: '2026-03-25T08:00:00Z', contract: null },
  'hire-6': { id: 'hire-6', jobId: 'djob-5', jobTitle: '타일 시공 — 로비 바닥', siteName: '광명역 복합쇼핑몰 신축', workDate: '2026-04-01', dailyWage: 580000, workerName: 'Đặng Thị Mai', workerPhone: '0956789012', status: 'CONTRACTED', reviewedAt: '2026-03-25T09:00:00Z', contract: { id: 'ctr-3', status: 'PENDING_WORKER_SIGN', workerSignedAt: null, managerSignedAt: null, downloadUrl: null } },
}

function formatVND(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫'
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  }).format(new Date(d))
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-[#EFF1F5] last:border-0">
      <span className="text-xs text-[#98A2B2] font-medium w-24 shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-[#25282A] font-medium flex-1">{value}</span>
    </div>
  )
}

interface Props {
  hireId: string
}

export default function HireDetailClient({ hireId }: Props) {
  const idToken = getSessionCookie()
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) ?? 'ko'

  const [hire, setHire] = React.useState<HireWithContract | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDemo, setIsDemo] = React.useState(false)
  const [creatingContract, setCreatingContract] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  React.useEffect(() => {
    if (DEMO_HIRES[hireId]) {
      setHire(DEMO_HIRES[hireId])
      setIsDemo(true)
      setIsLoading(false)
      return
    }
    if (!idToken) { setIsLoading(false); return }
    apiClient<HireWithContract>(`/applications/${hireId}`, { token: idToken })
      .then((res) => setHire(res.data))
      .catch(() => setHire(null))
      .finally(() => setIsLoading(false))
  }, [hireId, idToken])

  async function handleCreateContract() {
    if (!idToken || !hire) return
    setCreatingContract(true)
    try {
      await apiClient('/contracts/generate', {
        method: 'POST',
        token: idToken,
        body: JSON.stringify({ applicationId: hire.id }),
      })
      showToast('계약서가 생성되었습니다.')
      // Re-fetch to get updated contract info
      apiClient<HireWithContract>(`/applications/${hireId}`, { token: idToken })
        .then((res) => setHire(res.data))
        .catch(() => {})
    } catch (err) {
      showToast(err instanceof Error ? err.message : '계약서 생성 실패')
    } finally {
      setCreatingContract(false)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    )
  }

  if (!hire) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-sm text-[#D81A48] text-center">
        합격자 정보를 불러올 수 없습니다
      </div>
    )
  }

  const initial = hire.workerName.charAt(0).toUpperCase()

  return (
    <>
      {/* Back nav */}
      <Link
        href={`/${locale}/manager/hires`}
        className="inline-flex items-center gap-1.5 text-sm text-[#98A2B2] hover:text-[#25282A] mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        합격자 목록
      </Link>

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">데모 데이터</span>
          <span className="text-amber-600">— API 연결 후 실제 데이터가 표시됩니다</span>
        </div>
      )}

      {/* Worker card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#0669F7] flex items-center justify-center text-white text-xl font-bold shrink-0">
            {initial}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#25282A]">{hire.workerName}</h2>
            <p className="text-sm text-[#98A2B2]">{hire.workerPhone}</p>
          </div>
          <span className={`ml-auto inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            hire.status === 'CONTRACTED'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {hire.status === 'CONTRACTED' ? '계약완료' : '합격'}
          </span>
        </div>

        <a
          href={`tel:${hire.workerPhone}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-[#EFF1F5] text-[#25282A] font-medium text-sm hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          전화 연결
        </a>
      </div>

      {/* Job info */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 mb-4">
        <h3 className="text-sm font-semibold text-[#25282A] mb-3">근무 정보</h3>
        <InfoRow label="공고명" value={
          <Link href={`/${locale}/manager/jobs/${hire.jobId}`} className="text-[#0669F7] hover:underline">
            {hire.jobTitle}
          </Link>
        } />
        <InfoRow label="현장" value={hire.siteName} />
        <InfoRow label="근무일" value={formatDate(hire.workDate)} />
        <InfoRow label="일당" value={<span className="text-[#0669F7] font-bold">{formatVND(hire.dailyWage)}</span>} />
        {hire.reviewedAt && <InfoRow label="합격일" value={formatDate(hire.reviewedAt)} />}
      </div>

      {/* Contract section */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
        <h3 className="text-sm font-semibold text-[#25282A] mb-3">계약서</h3>

        {hire.contract ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${CONTRACT_STATUS_COLORS[hire.contract.status]}`}>
                {CONTRACT_STATUS_LABELS[hire.contract.status]}
              </span>
              <Link
                href={`/${locale}/manager/contracts/${hire.contract.id}`}
                className="px-4 py-2 rounded-2xl bg-[#0669F7] text-white font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                계약서 보기
              </Link>
              {hire.contract.downloadUrl && (
                <button
                  onClick={() => window.open(hire.contract!.downloadUrl!, '_blank')}
                  className="px-4 py-2 rounded-2xl border border-[#EFF1F5] text-[#25282A] font-medium text-sm hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
                >
                  다운로드
                </button>
              )}
            </div>

            <div className="text-xs text-[#98A2B2] space-y-1">
              {hire.contract.managerSignedAt && (
                <p>관리자 서명: {formatDate(hire.contract.managerSignedAt)}</p>
              )}
              {hire.contract.workerSignedAt && (
                <p>근로자 서명: {formatDate(hire.contract.workerSignedAt)}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-[#98A2B2] mb-3">아직 계약서가 생성되지 않았습니다</p>
            <button
              onClick={handleCreateContract}
              disabled={creatingContract || isDemo}
              className="px-5 py-2.5 rounded-2xl bg-[#0669F7] text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              {creatingContract ? '생성 중...' : '계약서 생성'}
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#25282A] text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </>
  )
}
