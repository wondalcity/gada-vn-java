'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  savedSigUrl,
  onUse,
  isSubmitting,
}: {
  savedSigUrl?: string | null
  onUse: (dataUrl: string, saveToProfile: boolean) => void
  isSubmitting?: boolean
}) {
  const { canvasRef, hasDrawn, startDrawing, draw, stopDrawing, clear, getDataUrl, checkIsEmpty } =
    useSignatureCanvas()
  const t = useTranslations('common')
  const [error, setError] = React.useState<string | null>(null)
  // Default: use saved tab if profile sig exists, otherwise draw
  const [useSaved, setUseSaved] = React.useState(!!savedSigUrl)
  // Offer to save drawn sig to profile only when there's no existing one
  const [saveToProfile, setSaveToProfile] = React.useState(!savedSigUrl)

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

  function handleUse() {
    setError(null)
    if (useSaved && savedSigUrl) {
      onUse(savedSigUrl, false)
    } else {
      if (checkIsEmpty()) { setError(t('worker_contracts.sign_error_empty')); return }
      onUse(getDataUrl(), saveToProfile)
    }
  }

  return (
    <div className="space-y-3">
      {/* Tab: Draw vs Use saved */}
      {savedSigUrl && (
        <div className="flex rounded-xl border border-[#EFF1F5] overflow-hidden">
          <button
            type="button"
            onClick={() => setUseSaved(false)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${!useSaved ? 'bg-[#0669F7] text-white' : 'bg-white text-[#98A2B2] hover:bg-[#F8F8FA] hover:text-[#25282A]'}`}
          >
            직접 서명
          </button>
          <button
            type="button"
            onClick={() => setUseSaved(true)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${useSaved ? 'bg-[#0669F7] text-white' : 'bg-white text-[#98A2B2] hover:bg-[#F8F8FA] hover:text-[#25282A]'}`}
          >
            저장된 서명 사용
          </button>
        </div>
      )}

      {useSaved && savedSigUrl ? (
        <div>
          <p className="text-xs font-medium text-[#98A2B2] mb-2">프로필에 저장된 서명</p>
          <div className="border-2 border-[#C8D8FF] rounded-xl bg-[#FAFCFF] p-4 flex items-center justify-center min-h-[120px]">
            <img src={savedSigUrl} alt="저장된 서명" className="max-h-24 object-contain" />
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-[#25282A]">{t('worker_contracts.sign_input_label')}</p>
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
                <p className="text-sm text-[#B2C4E0]">{t('worker_contracts.sign_placeholder')}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-[#98A2B2]">{t('worker_contracts.sign_hint')}</p>
          {/* Offer to save to profile when no saved signature exists */}
          {!savedSigUrl && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveToProfile}
                onChange={e => setSaveToProfile(e.target.checked)}
                className="w-4 h-4 rounded accent-[#0669F7]"
              />
              <span className="text-xs text-[#25282A]">이 서명을 프로필에 저장</span>
            </label>
          )}
        </>
      )}

      {error && (
        <div className="p-3 bg-[#FDE8EE] border border-[#F4A8B8] rounded-xl text-sm text-[#ED1C24]">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        {!useSaved && (
          <button
            type="button"
            onClick={() => { clear(); setError(null) }}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-full border border-[#DDDDDD] text-[#25282A] font-medium text-sm hover:border-[#0669F7] hover:text-[#0669F7] transition-colors disabled:opacity-40"
          >
            {t('worker_contracts.sign_clear')}
          </button>
        )}
        <button
          type="button"
          onClick={handleUse}
          disabled={(!useSaved && !hasDrawn) || isSubmitting}
          className="flex-1 py-3 rounded-full bg-[#0669F7] text-white font-semibold text-sm disabled:opacity-40 hover:bg-[#0557D4] transition-colors"
        >
          {isSubmitting ? '처리 중...' : '사용하기'}
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
  const t = useTranslations('common')
  const signed = !!signedAt
  if (!signed && canSign && onSignClick) {
    return (
      <button
        type="button"
        onClick={onSignClick}
        className="rounded-xl border-2 border-[#0669F7] bg-[#E6F0FE] p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center hover:bg-[#D6E8FE] active:scale-[0.97] transition-all w-full"
      >
        <p className="text-xs font-semibold text-[#0669F7]">{label}</p>
        <div className="w-10 h-10 rounded-full bg-[#0669F7] flex items-center justify-center shadow-sm">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </div>
        <p className="text-xs font-bold text-[#0669F7]">{t('worker_contracts.sig_sign_now')}</p>
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
        <p className="text-xs text-[#C8CBD0]">{t('worker_contracts.sig_pending')}</p>
      </div>
    )
  }
  if (sigUrl) {
    return (
      <button
        type="button"
        onClick={() => onView(sigUrl)}
        className="rounded-xl border-2 border-[#86D98A] bg-[#E6F9E6] p-3 flex flex-col items-center gap-1 min-h-[100px] justify-center hover:border-[#00C800] transition-colors w-full"
      >
        <p className="text-xs font-medium text-[#1A6B1A]">{label}</p>
        <div className="w-full h-14 flex items-center justify-center overflow-hidden rounded-lg bg-white border border-[#86D98A]">
          <img src={sigUrl} alt={label} className="max-h-full max-w-full object-contain p-1" />
        </div>
        <p className="text-xs text-[#1A6B1A] flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          {t('worker_contracts.sig_view')}
        </p>
      </button>
    )
  }
  return (
    <div className="rounded-xl border-2 border-[#86D98A] bg-[#E6F9E6] p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center">
      <p className="text-xs font-medium text-[#1A6B1A]">{label}</p>
      <div className="w-12 h-12 rounded-full bg-[#D6F0D6] flex items-center justify-center">
        <svg className="w-6 h-6 text-[#1A6B1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </div>
      <p className="text-xs text-[#1A6B1A]">{t('worker_contracts.sig_done')}</p>
    </div>
  )
}

function SignatureStatusCard({ contract, onSignClick }: { contract: Contract; onSignClick?: () => void }) {
  const t = useTranslations('common')
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
              <p className="text-sm font-semibold text-[#25282A]">{t('worker_contracts.sig_image')}</p>
              <button type="button" onClick={() => setViewingUrl(null)} className="w-7 h-7 rounded-full bg-[#F2F4F5] flex items-center justify-center text-[#98A2B2] hover:bg-[#EFF1F5]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 bg-[#F2F4F5] flex items-center justify-center min-h-[160px]">
              <img src={viewingUrl} alt={t('worker_contracts.sig_image')} className="max-w-full max-h-64 object-contain" />
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 space-y-4">
        <p className="text-sm font-semibold text-[#25282A]">{t('worker_contracts.signature_title')}</p>

        {/* Signing step flow indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
              contract.workerSignedAt ? 'bg-[#00C800] text-white' : 'bg-[#0669F7] text-white'
            }`}>
              {contract.workerSignedAt
                ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                : '1'}
            </div>
            <span className={`text-xs font-medium ${contract.workerSignedAt ? 'text-[#1A6B1A]' : 'text-[#0669F7]'}`}>
              {t('worker_contracts.sig_worker')}
            </span>
          </div>
          <svg className="w-4 h-4 shrink-0 text-[#DDDDDD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex items-center gap-1.5 flex-1 justify-end">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
              contract.managerSignedAt ? 'bg-[#00C800] text-white'
              : contract.status === 'PENDING_MANAGER_SIGN' ? 'bg-[#FFC72C] text-[#3C2C02]'
              : 'bg-[#EFF1F5] text-[#98A2B2]'
            }`}>
              {contract.managerSignedAt
                ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                : contract.status === 'PENDING_MANAGER_SIGN' ? '2'
                : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
            </div>
            <span className={`text-xs font-medium ${
              contract.managerSignedAt ? 'text-[#1A6B1A]'
              : contract.status === 'PENDING_MANAGER_SIGN' ? 'text-[#856404]'
              : 'text-[#98A2B2]'
            }`}>
              {t('worker_contracts.sig_manager')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SignatureBox
            label={t('worker_contracts.sig_worker')}
            signedAt={contract.workerSignedAt}
            sigUrl={contract.workerSigUrl}
            onView={setViewingUrl}
            canSign={canWorkerSign}
            onSignClick={canWorkerSign ? onSignClick : undefined}
          />
          {/* Manager box — locked until worker signs */}
          {contract.managerSignedAt ? (
            <SignatureBox
              label={t('worker_contracts.sig_manager')}
              signedAt={contract.managerSignedAt}
              sigUrl={contract.companySigUrl ?? contract.managerSigUrl}
              onView={setViewingUrl}
            />
          ) : contract.status === 'PENDING_MANAGER_SIGN' ? (
            <div className="rounded-xl border-2 border-dashed border-[#F5D87D] bg-[#FFFDF0] p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center">
              <p className="text-xs font-medium text-[#856404]">{t('worker_contracts.sig_manager')}</p>
              <div className="w-10 h-10 rounded-full bg-[#FFF8E6] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#FFC72C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-xs text-[#856404] font-medium">서명 대기중</p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-[#EFF1F5] bg-[#F9FAFB] p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center">
              <p className="text-xs font-medium text-[#98A2B2]">{t('worker_contracts.sig_manager')}</p>
              <div className="w-10 h-10 rounded-full bg-[#EFF1F5] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#C8CBD0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-xs text-[#C8CBD0] text-center leading-relaxed">근로자 서명 후<br/>활성화</p>
            </div>
          )}
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
  const t = useTranslations('common')
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'
  const documentRef = React.useRef<HTMLDivElement>(null)
  const isDemo = contractId.startsWith('demo-')
  const [contract, setContract] = React.useState<Contract | null>(
    isDemo ? (DEMO_CONTRACT_MAP[contractId] ?? null) : null
  )
  const [isLoading, setIsLoading] = React.useState(!isDemo)
  const [error, setError] = React.useState<string | null>(
    isDemo && !DEMO_CONTRACT_MAP[contractId] ? t('worker_contracts.not_found') : null
  )
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [showSignModal, setShowSignModal] = React.useState(false)
  const [profileSigUrl, setProfileSigUrl] = React.useState<string | null>(null)
  const [isConfirming, setIsConfirming] = React.useState(false)
  const [confirmError, setConfirmError] = React.useState<string | null>(null)
  const [previewWorkerSigUrl, setPreviewWorkerSigUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!idToken) return
    apiClient<{ signature_url?: string | null }>('/workers/me', { token: idToken })
      .then(({ data }) => { if (data.signature_url) setProfileSigUrl(data.signature_url) })
      .catch(() => {})
  }, [idToken])

  const load = React.useCallback(() => {
    if (isDemo) return
    if (!idToken) return
    setIsLoading(true)
    setError(null)
    apiClient<Contract>(`/contracts/${contractId}`, { token: idToken })
      .then(({ data }) => setContract(data))
      .catch(() => setError(t('worker_contracts.fetch_error')))
      .finally(() => setIsLoading(false))
  }, [contractId, idToken, isDemo, t])

  React.useEffect(() => { load() }, [load])

  async function handleDirectSign(dataUrl: string, saveToProfile: boolean) {
    setIsConfirming(true)
    setConfirmError(null)
    try {
      if (!isDemo && idToken) {
        await apiClient(`/contracts/${contractId}/sign`, {
          method: 'POST',
          token: idToken,
          body: JSON.stringify({ signatureData: dataUrl }),
        })
        // Show signature on contract document immediately
        setPreviewWorkerSigUrl(dataUrl)
        // Optionally save to profile
        if (saveToProfile) {
          await apiClient('/workers/me', {
            method: 'PUT',
            token: idToken,
            body: JSON.stringify({ signatureS3Key: dataUrl }),
          }).catch(() => {})
          setProfileSigUrl(dataUrl)
        }
      }
      setShowSignModal(false)
      setSuccessMessage(t('worker_contracts.sign_success'))
      if (!isDemo && idToken) {
        // Background refresh without skeleton to update contract status
        apiClient<Contract>(`/contracts/${contractId}`, { token: idToken })
          .then(({ data }) => setContract(data))
          .catch(() => {})
      }
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : t('worker_contracts.sign_error_generic'))
    } finally {
      setIsConfirming(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-6 space-y-4 animate-pulse">
        <div className="h-6 bg-[#DDDDDD] rounded w-1/3" />
        <div className="bg-white rounded-2xl border border-[#EFF1F5] p-4 space-y-3">
          <div className="h-4 bg-[#DDDDDD] rounded w-3/4" />
          <div className="h-4 bg-[#DDDDDD] rounded w-1/2" />
          <div className="h-4 bg-[#DDDDDD] rounded w-2/3" />
        </div>
        <div className="h-40 bg-[#DDDDDD] rounded-2xl" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="py-6">
        <Link href={'/worker/contracts' as never} className="hidden md:inline-flex items-center gap-1.5 text-sm text-[#98A2B2] hover:text-[#25282A] mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          {t('worker_contracts.list_back')}
        </Link>
        <p className="text-[#ED1C24] text-sm mb-4">{error ?? t('worker_contracts.not_found')}</p>
        <button type="button" onClick={load} className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium hover:bg-[#0557D4] transition-colors text-sm">
          {t('worker_contracts.retry')}
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
          onClick={() => { if (!isConfirming) setShowSignModal(false) }}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-base font-bold text-[#25282A]">{t('worker_contracts.modal_title')}</p>
              <button
                type="button"
                onClick={() => { if (!isConfirming) setShowSignModal(false) }}
                disabled={isConfirming}
                className="w-8 h-8 rounded-full bg-[#F2F4F5] flex items-center justify-center text-[#98A2B2] hover:bg-[#EFF1F5] transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 pb-8 sm:pb-5 space-y-3">
              <SignaturePad savedSigUrl={profileSigUrl} onUse={handleDirectSign} isSubmitting={isConfirming} />
              {confirmError && (
                <div className="p-3 bg-[#FDE8EE] border border-[#F4A8B8] rounded-xl text-sm text-[#ED1C24]">{confirmError}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Back nav */}
      <div className="flex items-center justify-between">
        <Link href={'/worker/contracts' as never} className="hidden md:inline-flex items-center gap-1.5 text-sm text-[#98A2B2] hover:text-[#25282A] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          {t('worker_contracts.list_back')}
        </Link>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="p-3 bg-[#E6F9E6] border border-[#86D98A] rounded-xl text-sm text-[#1A6B1A] flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          {successMessage}
        </div>
      )}

      {/* Status banner */}
      {contract.status === 'PENDING_WORKER_SIGN' && (
        <div className="p-4 bg-[#FFF8E6] border border-[#F5D87D] rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-[#FFC72C] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          <p className="text-sm font-medium text-[#856404]">{t('worker_contracts.banner_need_sign')}</p>
        </div>
      )}
      {contract.status === 'PENDING_MANAGER_SIGN' && (
        <div className="p-4 bg-[#E6F0FE] border border-[#B3D9FF] rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-[#0669F7] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm font-medium text-[#0669F7]">{t('worker_contracts.banner_waiting_manager')}</p>
        </div>
      )}
      {contract.status === 'FULLY_SIGNED' && (
        <div className="p-4 bg-[#E6F9E6] border border-[#86D98A] rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-[#00C800] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm font-medium text-[#1A6B1A]">{t('worker_contracts.banner_fully_signed')}</p>
        </div>
      )}

      {/* Contract document */}
      <div className="bg-white rounded-2xl border border-[#EFF1F5] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EFF1F5] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#0669F7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-semibold text-[#25282A]">{t('worker_contracts.document_title')}</span>
          </div>
          <ContractDownloadButton documentRef={documentRef} contractId={contract.id} />
        </div>
        <div className="overflow-x-auto">
          <ContractDocument contract={contract} documentRef={documentRef} previewWorkerSigUrl={previewWorkerSigUrl} />
        </div>
      </div>

      {/* Contract info card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 space-y-3">
        <p className="text-sm font-semibold text-[#25282A]">{t('worker_contracts.info_title')}</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#98A2B2]">{t('worker_contracts.info_job')}</span>
            <span className="text-[#25282A] font-medium text-right max-w-[60%]">{contract.jobTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#98A2B2]">{t('worker_contracts.info_site')}</span>
            <span className="text-[#25282A] text-right max-w-[60%]">{contract.siteName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#98A2B2]">{t('worker_contracts.info_work_date')}</span>
            <span className="text-[#25282A] font-medium">{formatDate(contract.workDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#98A2B2]">{t('worker_contracts.info_daily_wage')}</span>
            <span className="text-[#0669F7] font-bold">{formatVND(contract.dailyWage)}</span>
          </div>
          {contract.managerName && (
            <div className="flex justify-between">
              <span className="text-[#98A2B2]">{t('worker_contracts.info_manager')}</span>
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
