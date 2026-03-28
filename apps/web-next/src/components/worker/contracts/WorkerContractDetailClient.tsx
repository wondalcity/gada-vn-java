'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api/client'
import { useSignatureCanvas } from '@/hooks/useSignatureCanvas'
import type { Contract } from '@/types/contract'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/types/contract'

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

interface Props {
  contractId: string
}

export default function WorkerContractDetailClient({ contractId }: Props) {
  const { idToken } = useAuth()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'
  const [contract, setContract] = React.useState<Contract | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    if (!idToken) return
    setIsLoading(true)
    setError(null)
    apiClient<Contract>(`/contracts/${contractId}`, { token: idToken })
      .then(({ data }) => setContract(data))
      .catch(() => setError('계약서를 불러올 수 없습니다.'))
      .finally(() => setIsLoading(false))
  }, [contractId, idToken])

  React.useEffect(() => { load() }, [load])

  function handleSignSuccess() {
    setSuccessMessage('서명이 완료되었습니다! 사업주 서명을 기다리고 있습니다.')
    load()
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

      {/* Contract HTML content */}
      {contract.contractHtml && (
        <div className="bg-white rounded-2xl border border-[#EFF1F5] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EFF1F5] flex items-center gap-2">
            <svg className="w-4 h-4 text-[#0669F7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-semibold text-[#25282A]">근로계약서</span>
          </div>
          <div
            className="p-5 text-sm text-[#25282A] leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: contract.contractHtml }}
          />
        </div>
      )}

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
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4">
        <p className="text-sm font-semibold text-[#25282A] mb-4">서명 현황</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#98A2B2] mb-2 font-medium">근로자 서명</p>
            {contract.workerSigUrl ? (
              <div className="border border-[#EFF1F5] rounded-xl p-2 bg-[#FAFCFF]">
                <img src={contract.workerSigUrl} alt="근로자 서명" className="max-h-20 object-contain mx-auto" />
              </div>
            ) : (
              <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl h-20 flex items-center justify-center">
                <p className="text-xs text-[#98A2B2]">서명 필요</p>
              </div>
            )}
            {contract.workerSignedAt && (
              <p className="text-[10px] text-[#98A2B2] mt-1 text-center">
                {new Date(contract.workerSignedAt).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-[#98A2B2] mb-2 font-medium">사업주 서명</p>
            {contract.managerSigUrl ? (
              <div className="border border-[#EFF1F5] rounded-xl p-2 bg-[#FAFCFF]">
                <img src={contract.managerSigUrl} alt="사업주 서명" className="max-h-20 object-contain mx-auto" />
              </div>
            ) : (
              <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl h-20 flex items-center justify-center">
                <p className="text-xs text-[#98A2B2]">서명 대기</p>
              </div>
            )}
            {contract.managerSignedAt && (
              <p className="text-[10px] text-[#98A2B2] mt-1 text-center">
                {new Date(contract.managerSignedAt).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Signature pad — only when worker needs to sign */}
      {contract.status === 'PENDING_WORKER_SIGN' && idToken && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-4">
          <SignaturePad contractId={contractId} token={idToken} onSuccess={handleSignSuccess} />
        </div>
      )}

      {/* Download button — only when fully signed */}
      {contract.status === 'FULLY_SIGNED' && contract.downloadUrl && (
        <button
          type="button"
          onClick={() => window.open(contract.downloadUrl!, '_blank')}
          className="w-full py-3 rounded-full bg-[#0669F7] text-white font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          계약서 다운로드
        </button>
      )}
    </div>
  )
}
