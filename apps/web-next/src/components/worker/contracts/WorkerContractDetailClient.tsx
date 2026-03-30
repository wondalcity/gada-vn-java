'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api/client'
import { useSignatureCanvas } from '@/hooks/useSignatureCanvas'
import type { Contract } from '@/types/contract'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/types/contract'
import { ContractDocument, ContractDownloadButton } from '@/components/contracts/ContractDocument'

function formatVND(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫'
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function SignaturePad({
  contractId,
  token,
  onSuccess,
}: {
  contractId: string
  token: string
  onSuccess: () => void
}) {
  const { canvasRef, hasDrawn, startDrawing, draw, stopDrawing, clear, getDataUrl, checkIsEmpty } =
    useSignatureCanvas()
  const [isSigning, setIsSigning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('mouseleave', stopDrawing)
    canvas.addEventListener('touchstart', startDrawing, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', stopDrawing)
    return () => {
      canvas.removeEventListener('mousedown', startDrawing)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', stopDrawing)
      canvas.removeEventListener('mouseleave', stopDrawing)
      canvas.removeEventListener('touchstart', startDrawing)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stopDrawing)
    }
  }, [startDrawing, draw, stopDrawing, canvasRef])

  async function handleSign() {
    if (checkIsEmpty()) { setError('서명을 입력해 주세요.'); return }
    setIsSigning(true)
    setError(null)
    try {
      const dataUrl = getDataUrl()
      await apiClient(`/contracts/${contractId}/sign`, {
        method: 'POST',
        token,
        body: JSON.stringify({ signatureData: dataUrl }),
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : '서명 중 오류가 발생했습니다.')
    } finally {
      setIsSigning(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[#25282A]">서명 입력</p>
      <div className="relative border-2 border-dashed border-[#C8D8FF] rounded-xl overflow-hidden bg-[#FAFCFF]">
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '160px',
            touchAction: 'none',
            display: 'block',
            cursor: 'crosshair',
          }}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-[#B2C4E0]">여기에 서명하세요</p>
          </div>
        )}
      </div>
      <p className="text-xs text-[#98A2B2]">손가락이나 마우스로 서명하세요</p>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#ED1C24]">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => { clear(); setError(null) }}
          className="flex-1 py-3 rounded-full border border-[#DDDDDD] text-[#25282A] font-medium text-sm hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
        >
          지우기
        </button>
        <button
          type="button"
          onClick={handleSign}
          disabled={isSigning || !hasDrawn}
          className="flex-1 py-3 rounded-full bg-[#0669F7] text-white font-semibold text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {isSigning ? '서명 중...' : '서명 완료'}
        </button>
      </div>
    </div>
  )
}

const DEMO_CONTRACT_MAP: Record<string, Contract> = {
  'demo-ctr-1': {
    id: 'demo-ctr-1',
    status: 'PENDING_WORKER_SIGN',
    jobTitle: '전기 배선 작업',
    siteName: '롯데몰 하노이 지하 1층 공사',
    siteAddress: '54 Liễu Giai, Ngọc Khánh, Ba Đình, Hà Nội',
    workDate: '2026-03-28',
    startTime: '07:30',
    endTime: '17:30',
    slotsTotal: 4,
    dailyWage: 700000,
    workerName: '홍길동',
    workerPhone: '0901 234 567',
    managerName: 'Kim Soo-jin',
    managerPhone: '0912 345 678',
    downloadUrl: null,
    workerSigUrl: null,
    managerSigUrl: null,
    workerSignedAt: null,
    managerSignedAt: null,
    createdAt: '2026-03-22T10:00:00Z',
  },
  'demo-ctr-2': {
    id: 'demo-ctr-2',
    status: 'FULLY_SIGNED',
    jobTitle: '철근 조립 — 3층 골조',
    siteName: '광명역 복합쇼핑몰 신축',
    siteAddress: '1 Hoàng Ngân, Trung Hòa, Cầu Giấy, Hà Nội',
    workDate: '2026-03-25',
    startTime: '07:00',
    endTime: '17:00',
    slotsTotal: 6,
    dailyWage: 620000,
    workerName: '홍길동',
    workerPhone: '0901 234 567',
    managerName: 'Lee Yeon-soo',
    managerPhone: '0988 765 432',
    downloadUrl: null,
    workerSigUrl: null,
    managerSigUrl: null,
    workerSignedAt: '2026-03-16T14:00:00Z',
    managerSignedAt: '2026-03-17T09:30:00Z',
    createdAt: '2026-03-15T08:00:00Z',
  },
  'demo-ctr-3': {
    id: 'demo-ctr-3',
    status: 'PENDING_MANAGER_SIGN',
    jobTitle: '잡부 — 자재 운반',
    siteName: '인천 송도 물류센터',
    siteAddress: '100 Phạm Hùng, Mỹ Đình, Nam Từ Liêm, Hà Nội',
    workDate: '2026-03-30',
    startTime: '08:00',
    endTime: '17:00',
    slotsTotal: 10,
    dailyWage: 410000,
    workerName: '홍길동',
    workerPhone: '0901 234 567',
    managerName: 'Park Joon-ho',
    managerPhone: '0976 543 210',
    downloadUrl: null,
    workerSigUrl: null,
    managerSigUrl: null,
    workerSignedAt: '2026-03-25T11:00:00Z',
    managerSignedAt: null,
    createdAt: '2026-03-24T09:00:00Z',
  },
}

function SignatureBox({
  label,
  signedAt,
  sigUrl,
  onView,
  canSign,
  onSignClick,
}: {
  label: string
  signedAt: string | null
  sigUrl?: string | null
  onView: (url: string) => void
  canSign?: boolean
  onSignClick?: () => void
}) {
  const signed = !!signedAt
  if (!signed && canSign && onSignClick) {
    return (
      <button
        type="button"
        onClick={onSignClick}
        className="rounded-xl border-2 border-[#0669F7] bg-blue-50 p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center hover:bg-blue-100 active:scale-[0.97] transition-all w-full"
      >
        <p className="text-xs font-semibold text-[#0669F7]">{label}</p>
        <div className="w-10 h-10 rounded-full bg-[#0669F7] flex items-center justify-center shadow-sm">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </div>
        <p className="text-xs font-bold text-[#0669F7]">서명하기</p>
      </button>
    )
  }
  if (!signed) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[#EFF1F5] p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center">
        <p className="text-xs font-medium text-[#98A2B2]">{label}</p>
        <div className="w-10 h-10 rounded-full bg-[#F2F4F5] flex items-center justify-center">
          <svg className="w-5 h-5 text-[#C8CBD0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </div>
        <p className="text-xs text-[#C8CBD0]">서명 대기</p>
      </div>
    )
  }
  if (sigUrl) {
    return (
      <button
        type="button"
        onClick={() => onView(sigUrl)}
        className="rounded-xl border-2 border-green-200 bg-green-50 p-3 flex flex-col items-center gap-1 min-h-[100px] justify-center hover:border-green-400 transition-colors w-full"
      >
        <p className="text-xs font-medium text-green-700">{label}</p>
        <div className="w-full h-14 flex items-center justify-center overflow-hidden rounded-lg bg-white border border-green-100">
          <img src={sigUrl} alt={label} className="max-h-full max-w-full object-contain p-1" />
        </div>
        <p className="text-xs text-green-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          확인
        </p>
      </button>
    )
  }
  return (
    <div className="rounded-xl border-2 border-green-200 bg-green-50 p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center">
      <p className="text-xs font-medium text-green-700">{label}</p>
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
        <span className="text-2xl">✅</span>
      </div>
      <p className="text-xs text-green-600">서명 완료</p>
    </div>
  )
}

function SignatureStatusCard({ contract, onSignClick }: { contract: Contract; onSignClick?: () => void }) {
  const [viewingUrl, setViewingUrl] = React.useState<string | null>(null)
  const canWorkerSign = contract.status === 'PENDING_WORKER_SIGN'
  return (
    <>
      {viewingUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setViewingUrl(null)}
        >
          <div className="relative max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#EFF1F5] flex items-center justify-between">
              <p className="text-sm font-semibold text-[#25282A]">서명 이미지</p>
              <button type="button" onClick={() => setViewingUrl(null)} className="w-7 h-7 rounded-full bg-[#F2F4F5] flex items-center justify-center text-[#98A2B2] hover:bg-[#EFF1F5]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 bg-gray-50 flex items-center justify-center min-h-[160px]">
              <img src={viewingUrl} alt="서명" className="max-w-full max-h-64 object-contain" />
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 space-y-3">
        <p className="text-sm font-semibold text-[#25282A]">서명 현황</p>
        <div className="grid grid-cols-2 gap-3">
          <SignatureBox
            label="근로자 서명"
            signedAt={contract.workerSignedAt}
            sigUrl={contract.workerSigUrl}
            onView={setViewingUrl}
            canSign={canWorkerSign}
            onSignClick={canWorkerSign ? onSignClick : undefined}
          />
          <SignatureBox
            label="사업주 서명"
            signedAt={contract.managerSignedAt}
            sigUrl={contract.companySigUrl ?? contract.managerSigUrl}
            onView={setViewingUrl}
          />
        </div>
      </div>
    </>
  )
}

interface Props {
  contractId: string
}

export default function WorkerContractDetailClient({ contractId }: Props) {
  const { idToken } = useAuth()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'
  const documentRef = React.useRef<HTMLDivElement>(null)
  const isDemo = contractId.startsWith('demo-')
  const [contract, setContract] = React.useState<Contract | null>(
    isDemo ? (DEMO_CONTRACT_MAP[contractId] ?? null) : null
  )
  const [isLoading, setIsLoading] = React.useState(!isDemo)
  const [error, setError] = React.useState<string | null>(
    isDemo && !DEMO_CONTRACT_MAP[contractId] ? '계약서를 찾을 수 없습니다.' : null
  )
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [showSignModal, setShowSignModal] = React.useState(false)

  const load = React.useCallback(() => {
    if (isDemo) return
    if (!idToken) return
    setIsLoading(true)
    setError(null)
    apiClient<Contract>(`/contracts/${contractId}`, { token: idToken })
      .then(({ data }) => setContract(data))
      .catch(() => setError('계약서를 불러올 수 없습니다.'))
      .finally(() => setIsLoading(false))
  }, [contractId, idToken, isDemo])

  React.useEffect(() => { load() }, [load])

  function handleSignSuccess() {
    setShowSignModal(false)
    setSuccessMessage('서명이 완료되었습니다! 사업주 서명을 기다리고 있습니다.')
    if (!isDemo) load()
  }

  if (isLoading) {
    return (
      <div className="py-6 space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="bg-white rounded-2xl border border-[#EFF1F5] p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
        <div className="h-40 bg-gray-200 rounded-2xl" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="py-6">
        <Link href={`/${locale}/worker/contracts` as never} className="inline-flex items-center gap-1.5 text-sm text-[#98A2B2] hover:text-[#25282A] mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          계약서 목록
        </Link>
        <p className="text-[#ED1C24] text-sm mb-4">{error ?? '계약서를 찾을 수 없습니다.'}</p>
        <button type="button" onClick={load} className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm">
          다시 시도
        </button>
      </div>
    )
  }

  const statusLabel = CONTRACT_STATUS_LABELS[contract.status]
  const statusColor = CONTRACT_STATUS_COLORS[contract.status]

  return (
    <div className="py-6 space-y-4">
      {/* Signature modal */}
      {showSignModal && idToken && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSignModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-base font-bold text-[#25282A]">근로자 서명</p>
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                className="w-8 h-8 rounded-full bg-[#F2F4F5] flex items-center justify-center text-[#98A2B2] hover:bg-[#EFF1F5] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 pb-8 sm:pb-5">
              <SignaturePad contractId={contractId} token={idToken} onSuccess={handleSignSuccess} />
            </div>
          </div>
        </div>
      )}

      {/* Back nav */}
      <div className="flex items-center justify-between">
        <Link href={`/${locale}/worker/contracts` as never} className="inline-flex items-center gap-1.5 text-sm text-[#98A2B2] hover:text-[#25282A] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          계약서 목록
        </Link>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          {successMessage}
        </div>
      )}

      {/* Status banner */}
      {contract.status === 'PENDING_WORKER_SIGN' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          <p className="text-sm font-medium text-amber-700">서명이 필요합니다. 계약 내용을 확인한 후 하단 서명란에 서명해 주세요.</p>
        </div>
      )}
      {contract.status === 'PENDING_MANAGER_SIGN' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm font-medium text-blue-700">근로자 서명이 완료되었습니다. 사업주 서명을 기다리고 있습니다.</p>
        </div>
      )}
      {contract.status === 'FULLY_SIGNED' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm font-medium text-green-700">계약이 완료되었습니다. 양측이 모두 서명하였습니다.</p>
        </div>
      )}

      {/* Contract document */}
      <div className="bg-white rounded-2xl border border-[#EFF1F5] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EFF1F5] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#0669F7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-semibold text-[#25282A]">근로계약서</span>
          </div>
          <ContractDownloadButton documentRef={documentRef} contractId={contract.id} />
        </div>
        <div className="overflow-x-auto">
          <ContractDocument contract={contract} documentRef={documentRef} />
        </div>
      </div>

      {/* Contract info card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 space-y-3">
        <p className="text-sm font-semibold text-[#25282A]">계약 정보</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#98A2B2]">일자리</span>
            <span className="text-[#25282A] font-medium text-right max-w-[60%]">{contract.jobTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#98A2B2]">현장</span>
            <span className="text-[#25282A] text-right max-w-[60%]">{contract.siteName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#98A2B2]">근무일</span>
            <span className="text-[#25282A] font-medium">{formatDate(contract.workDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#98A2B2]">일당</span>
            <span className="text-[#0669F7] font-bold">{formatVND(contract.dailyWage)}</span>
          </div>
          {contract.managerName && (
            <div className="flex justify-between">
              <span className="text-[#98A2B2]">담당 사업주</span>
              <span className="text-[#25282A]">{contract.managerName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Signature status */}
      <SignatureStatusCard contract={contract} onSignClick={() => setShowSignModal(true)} />

    </div>
  )
}
