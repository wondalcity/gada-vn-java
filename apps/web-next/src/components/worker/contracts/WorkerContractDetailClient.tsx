'use client'

import * as React from 'react'
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
    if (checkIsEmpty()) {
      setError('서명을 입력해 주세요.')
      return
    }
    setIsSigning(true)
    setError(null)
    try {
      const dataUrl = getDataUrl()
      await apiClient(`/worker/contracts/${contractId}/sign`, {
        method: 'POST',
        token,
        body: JSON.stringify({ signature_data_url: dataUrl }),
      })
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '서명 중 오류가 발생했습니다.'
      setError(msg)
    } finally {
      setIsSigning(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-[#25282A]">서명 입력</p>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '160px',
          border: '1px solid #DDDDDD',
          borderRadius: '4px',
          touchAction: 'none',
          display: 'block',
          cursor: 'crosshair',
          backgroundColor: '#FAFAFA',
        }}
      />
      <p className="text-xs text-[#7A7B7A]">손가락이나 마우스로 서명하세요</p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-sm text-[#ED1C24]">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            clear()
            setError(null)
          }}
          className="flex-1 py-3 rounded-full border border-[#DDDDDD] text-[#25282A] font-medium text-sm hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
        >
          지우기
        </button>
        <button
          type="button"
          onClick={handleSign}
          disabled={isSigning || !hasDrawn}
          className="flex-1 py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {isSigning ? '서명 중...' : '서명하기'}
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
  const [contract, setContract] = React.useState<Contract | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    if (!idToken) return
    setIsLoading(true)
    setError(null)
    apiClient<Contract>(`/worker/contracts/${contractId}`, { token: idToken })
      .then(({ data }) => setContract(data))
      .catch(() => setError('계약서를 불러올 수 없습니다.'))
      .finally(() => setIsLoading(false))
  }, [contractId, idToken])

  React.useEffect(() => {
    load()
  }, [load])

  function handleSignSuccess() {
    setSuccessMessage('서명이 완료되었습니다.')
    load()
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2" />
        <div className="bg-white rounded-sm border border-[#DDDDDD] p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
        <div className="h-24 bg-gray-200 rounded" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-[#ED1C24] text-sm mb-4">{error ?? '계약서를 찾을 수 없습니다.'}</p>
        <button
          type="button"
          onClick={load}
          className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm"
        >
          다시 시도
        </button>
      </div>
    )
  }

  const statusLabel = CONTRACT_STATUS_LABELS[contract.status]
  const statusColor = CONTRACT_STATUS_COLORS[contract.status]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[#25282A]">계약서</h1>

      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-sm text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Status banner */}
      {contract.status === 'PENDING_WORKER_SIGN' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm">
          <p className="text-sm font-medium text-amber-700">
            서명이 필요합니다. 아래 서명란에 서명해 주세요.
          </p>
        </div>
      )}
      {contract.status === 'PENDING_MANAGER_SIGN' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
          <p className="text-sm font-medium text-blue-700">
            서명이 완료되었습니다. 사업주 서명을 기다리고 있습니다.
          </p>
        </div>
      )}
      {contract.status === 'FULLY_SIGNED' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-sm">
          <p className="text-sm font-medium text-green-700">계약이 완료되었습니다.</p>
        </div>
      )}
      {contract.status === 'VOID' && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
          <p className="text-sm font-medium text-gray-500">이 계약은 무효 처리되었습니다.</p>
        </div>
      )}

      {/* Contract info card */}
      <div className="bg-white rounded-sm shadow-sm border border-[#DDDDDD] p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[#25282A] text-sm">{contract.jobTitle}</p>
            <p className="text-xs text-[#7A7B7A] mt-0.5">{contract.siteName}</p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="border-t border-[#DDDDDD] pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[#7A7B7A]">근무일</span>
            <span className="text-[#25282A] font-medium">{formatDate(contract.workDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#7A7B7A]">일당</span>
            <span className="text-[#0669F7] font-bold">{formatVND(contract.dailyWage)}</span>
          </div>
          {contract.managerName && (
            <div className="flex justify-between">
              <span className="text-[#7A7B7A]">담당 사업주</span>
              <span className="text-[#25282A]">{contract.managerName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Signatures */}
      <div className="bg-white rounded-sm shadow-sm border border-[#DDDDDD] p-4 space-y-4">
        <p className="text-sm font-semibold text-[#25282A]">서명 현황</p>

        <div className="grid grid-cols-2 gap-4">
          {/* Manager signature */}
          <div>
            <p className="text-xs text-[#7A7B7A] mb-2">사업주 서명</p>
            {contract.managerSigUrl ? (
              <div className="border border-[#DDDDDD] rounded-sm p-2 bg-gray-50">
                <img
                  src={contract.managerSigUrl}
                  alt="사업주 서명"
                  className="max-h-20 object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="border border-dashed border-[#DDDDDD] rounded-sm h-20 flex items-center justify-center">
                <p className="text-xs text-[#7A7B7A]">서명 대기</p>
              </div>
            )}
            {contract.managerSignedAt && (
              <p className="text-xs text-[#7A7B7A] mt-1">
                {new Date(contract.managerSignedAt).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>

          {/* Worker signature */}
          <div>
            <p className="text-xs text-[#7A7B7A] mb-2">근로자 서명</p>
            {contract.workerSigUrl ? (
              <div className="border border-[#DDDDDD] rounded-sm p-2 bg-gray-50">
                <img
                  src={contract.workerSigUrl}
                  alt="근로자 서명"
                  className="max-h-20 object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="border border-dashed border-[#DDDDDD] rounded-sm h-20 flex items-center justify-center">
                <p className="text-xs text-[#7A7B7A]">서명 필요</p>
              </div>
            )}
            {contract.workerSignedAt && (
              <p className="text-xs text-[#7A7B7A] mt-1">
                {new Date(contract.workerSignedAt).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Signature pad — only when worker needs to sign */}
      {contract.status === 'PENDING_WORKER_SIGN' && idToken && (
        <div className="bg-white rounded-sm shadow-sm border border-[#DDDDDD] p-4">
          <SignaturePad
            contractId={contractId}
            token={idToken}
            onSuccess={handleSignSuccess}
          />
        </div>
      )}

      {/* Download button — only when fully signed */}
      {contract.status === 'FULLY_SIGNED' && contract.downloadUrl && (
        <button
          type="button"
          onClick={() => window.open(contract.downloadUrl!, '_blank')}
          className="w-full py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          계약서 다운로드
        </button>
      )}
    </div>
  )
}
