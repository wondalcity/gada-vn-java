'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { useParams } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import { useSignatureCanvas } from '@/hooks/useSignatureCanvas'
import type { Contract } from '@/types/contract'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/types/contract'
import { ContractDocument, ContractDownloadButton } from '@/components/contracts/ContractDocument'

function ManagerSignaturePad({
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
      await apiClient(`/contracts/${contractId}/manager-sign`, {
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
      <p className="text-sm font-semibold text-[#25282A]">사업주 서명 입력</p>
      <div className="relative border-2 border-dashed border-[#C8D8FF] rounded-xl overflow-hidden bg-[#FAFCFF]">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '160px', touchAction: 'none', display: 'block', cursor: 'crosshair' }}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-[#B2C4E0]">여기에 서명하세요</p>
          </div>
        )}
      </div>
      <p className="text-xs text-[#98A2B2]">손가락이나 마우스로 서명하세요</p>
      {error && (
        <div className="p-3 bg-[#FDE8EE] border border-[#F4A8B8] rounded-xl text-sm text-[#ED1C24]">{error}</div>
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
          className="flex-1 py-3 rounded-full bg-[#0669F7] text-white font-semibold text-sm disabled:opacity-40 hover:bg-[#0557D4] transition-colors"
        >
          {isSigning ? '서명 중...' : '서명 완료'}
        </button>
      </div>
    </div>
  )
}

interface Props { contractId: string }

export default function ManagerContractClient({ contractId }: Props) {
  const idToken = getSessionCookie()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'
  const documentRef = React.useRef<HTMLDivElement>(null)

  const [contract, setContract] = React.useState<Contract | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [showSignModal, setShowSignModal] = React.useState(false)

  const load = React.useCallback(() => {
    if (!idToken) return
    setIsLoading(true); setError(null)
    apiClient<Contract>(`/contracts/${contractId}`, { token: idToken })
      .then(({ data }) => setContract(data))
      .catch(() => setError('계약서를 불러올 수 없습니다.'))
      .finally(() => setIsLoading(false))
  }, [contractId, idToken])

  React.useEffect(() => { load() }, [load])

  function handleSignSuccess() {
    setShowSignModal(false)
    setSuccessMessage('서명이 완료되었습니다! 계약이 확정되었습니다.')
    load()
  }

  if (isLoading) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6 space-y-4 animate-pulse">
        <div className="h-6 bg-[#DDDDDD] rounded w-1/3" />
        <div className="bg-white rounded-2xl border border-[#EFF1F5] p-4 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-[#DDDDDD] rounded" />)}
        </div>
        <div className="h-48 bg-[#DDDDDD] rounded" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6">
        <p className="text-[#ED1C24] text-sm mb-4">{error ?? '계약서를 찾을 수 없습니다.'}</p>
        <button type="button" onClick={load} className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium hover:bg-[#0557D4] transition-colors text-sm">다시 시도</button>
      </div>
    )
  }

  const statusLabel = CONTRACT_STATUS_LABELS[contract.status]
  const statusColor = CONTRACT_STATUS_COLORS[contract.status]

  return (
    <div className="max-w-[1760px] mx-auto px-4 py-6 space-y-4">
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
              <p className="text-base font-bold text-[#25282A]">사업주 서명</p>
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                className="w-8 h-8 rounded-full bg-[#F2F4F5] flex items-center justify-center text-[#98A2B2] hover:bg-[#EFF1F5] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 pb-8 sm:pb-5">
              <ManagerSignaturePad contractId={contractId} token={idToken} onSuccess={handleSignSuccess} />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={'/manager/contracts'} className="p-1.5 rounded-full hover:bg-[#F2F4F5] transition-colors text-[#98A2B2]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#25282A]">근로계약서</h1>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{statusLabel}</span>
        </div>
        <ContractDownloadButton documentRef={documentRef} contractId={contract.id} />
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="p-3 bg-[#E6F9E6] border border-[#86D98A] rounded-2xl text-sm text-[#1A6B1A] flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          {successMessage}
        </div>
      )}

      {/* Status banners */}
      {contract.status === 'PENDING_WORKER_SIGN' && (
        <div className="p-4 bg-[#FFF8E6] border border-[#F5D87D] rounded-2xl">
          <p className="text-sm font-medium text-[#856404]">근로자 서명을 기다리고 있습니다.</p>
        </div>
      )}
      {contract.status === 'PENDING_MANAGER_SIGN' && (
        <div className="p-4 bg-[#E6F0FE] border border-[#B3D9FF] rounded-2xl flex items-start gap-3">
          <svg className="w-5 h-5 text-[#0669F7] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          <p className="text-sm font-medium text-[#0669F7]">근로자 서명이 완료되었습니다. 아래에서 사업주 서명을 해주세요.</p>
        </div>
      )}
      {contract.status === 'FULLY_SIGNED' && (
        <div className="p-4 bg-[#E6F9E6] border border-[#86D98A] rounded-2xl">
          <p className="text-sm font-medium text-[#1A6B1A]">계약이 완료되었습니다. 오른쪽 상단의 버튼으로 이미지를 저장하세요.</p>
        </div>
      )}
      {contract.status === 'VOID' && (
        <div className="p-4 bg-[#F2F4F5] border border-[#DDDDDD] rounded-2xl">
          <p className="text-sm font-medium text-[#7A7B7A]">이 계약은 무효 처리되었습니다.</p>
        </div>
      )}

      {/* Contract document */}
      <div className="overflow-x-auto rounded-2xl border border-[#EFF1F5] shadow-sm">
        <ContractDocument contract={contract} documentRef={documentRef} />
      </div>

      {/* Signature status */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 space-y-3">
        <p className="text-sm font-semibold text-[#25282A]">서명 현황</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Worker signature — display only */}
          {contract.workerSignedAt ? (
            <div className="rounded-xl border-2 border-[#86D98A] bg-[#E6F9E6] p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center">
              <p className="text-xs font-medium text-[#1A6B1A]">근로자 서명</p>
              {contract.workerSigUrl ? (
                <div className="w-full h-14 flex items-center justify-center overflow-hidden rounded-lg bg-white border border-[#86D98A]">
                  <img src={contract.workerSigUrl} alt="근로자 서명" className="max-h-full max-w-full object-contain p-1" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#D6F0D6] flex items-center justify-center"><svg className="w-6 h-6 text-[#1A6B1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>
              )}
              <p className="text-xs text-[#1A6B1A]">서명 완료</p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-[#EFF1F5] p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center">
              <p className="text-xs font-medium text-[#98A2B2]">근로자 서명</p>
              <div className="w-10 h-10 rounded-full bg-[#F2F4F5] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#C8CBD0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
              <p className="text-xs text-[#C8CBD0]">서명 대기</p>
            </div>
          )}
          {/* Manager signature — active button when pending */}
          {contract.status === 'PENDING_MANAGER_SIGN' ? (
            <button
              type="button"
              onClick={() => setShowSignModal(true)}
              className="rounded-xl border-2 border-[#0669F7] bg-[#E6F0FE] p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center hover:bg-[#D6E8FE] active:scale-[0.97] transition-all w-full"
            >
              <p className="text-xs font-semibold text-[#0669F7]">사업주 서명</p>
              <div className="w-10 h-10 rounded-full bg-[#0669F7] flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
              <p className="text-xs font-bold text-[#0669F7]">서명하기</p>
            </button>
          ) : contract.managerSignedAt ? (
            <div className="rounded-xl border-2 border-[#86D98A] bg-[#E6F9E6] p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center">
              <p className="text-xs font-medium text-[#1A6B1A]">사업주 서명</p>
              {(contract.companySigUrl ?? contract.managerSigUrl) ? (
                <div className="w-full h-14 flex items-center justify-center overflow-hidden rounded-lg bg-white border border-[#86D98A]">
                  <img src={(contract.companySigUrl ?? contract.managerSigUrl)!} alt="사업주 서명" className="max-h-full max-w-full object-contain p-1" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#D6F0D6] flex items-center justify-center"><svg className="w-6 h-6 text-[#1A6B1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>
              )}
              <p className="text-xs text-[#1A6B1A]">서명 완료</p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-[#EFF1F5] p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center">
              <p className="text-xs font-medium text-[#98A2B2]">사업주 서명</p>
              <div className="w-10 h-10 rounded-full bg-[#F2F4F5] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#C8CBD0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
              <p className="text-xs text-[#C8CBD0]">서명 대기</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
