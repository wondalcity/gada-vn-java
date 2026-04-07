'use client'

import * as React from 'react'
import { ManagerDraft } from '@/types/manager-application'

interface Props {
  draft: ManagerDraft
  onChange: (partial: Partial<ManagerDraft>) => void
  onNext: () => void
  onBack: () => void
  isSaving: boolean
  idToken: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, data] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  } catch { return null }
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ draft }: { draft: ManagerDraft }) {
  const businessTypeLabel = draft.businessType === 'INDIVIDUAL' ? '개인사업자' : draft.businessType === 'CORPORATE' ? '법인사업자' : null
  const signatureStatus = (draft.signatureDataUrl || draft.signatureUrl) ? '완료' : '미등록'
  const signatureColor = (draft.signatureDataUrl || draft.signatureUrl) ? 'text-green-700' : 'text-[#98A2B2]'

  const rows: { label: string; value: string | null; highlight?: boolean }[] = [
    { label: '사업자 유형', value: businessTypeLabel },
    ...(draft.businessType === 'CORPORATE'
      ? [{ label: '회사명', value: draft.companyName || null }]
      : []),
    { label: '대표자명', value: draft.representativeName || null },
    { label: '사업자 등록번호', value: draft.businessRegNumber || null },
    { label: '첫 번째 현장', value: draft.firstSiteName || null },
  ]

  return (
    <div className="bg-gray-50 border border-[#EFF1F5] rounded-2xl p-4">
      <p className="text-sm font-medium text-[#25282A] mb-3">신청 내용 확인</p>
      <ul className="space-y-2">
        {rows.map((row) => {
          if (!row.value) return null
          return (
            <li key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-sm text-[#98A2B2]">{row.label}</span>
              <span className="text-sm text-[#25282A] font-medium text-right">{row.value}</span>
            </li>
          )
        })}
        <li className="flex items-center justify-between gap-3">
          <span className="text-sm text-[#98A2B2]">서명</span>
          <span className={`text-sm font-medium ${signatureColor}`}>{signatureStatus}</span>
        </li>
      </ul>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManagerAgreementStep({
  draft,
  onChange,
  onNext,
  onBack,
  isSaving,
  idToken,
}: Props) {
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const canSubmit = draft.termsAccepted && draft.privacyAccepted

  function handleAgreeAll() {
    onChange({ termsAccepted: true, privacyAccepted: true })
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload: Record<string, unknown> = {
        businessType: draft.businessType,
        representativeName: draft.representativeName,
        termsAccepted: true,
        privacyAccepted: true,
      }
      if (draft.companyName) payload.companyName = draft.companyName
      if (draft.representativeDob) payload.representativeDob = draft.representativeDob
      if (draft.representativeGender) payload.representativeGender = draft.representativeGender
      if (draft.businessRegNumber) payload.businessRegNumber = draft.businessRegNumber
      if (draft.contactPhone) payload.contactPhone = draft.contactPhone
      if (draft.contactAddress) payload.contactAddress = draft.contactAddress
      if (draft.province) payload.province = draft.province
      if (draft.firstSiteName) payload.firstSiteName = draft.firstSiteName
      if (draft.firstSiteAddress) payload.firstSiteAddress = draft.firstSiteAddress
      if (draft.signatureDataUrl) payload.signatureDataUrl = draft.signatureDataUrl

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'
      const res = await fetch(`${API_BASE}/managers/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const body = await res.json()
      if (!res.ok) {
        throw new Error(body.message ?? '신청 중 오류가 발생했습니다.')
      }

      onNext()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '신청 중 오류가 발생했습니다.'
      setSubmitError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const loading = isSubmitting || isSaving

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">동의 및 제출</h2>
        <p className="text-sm text-[#98A2B2] mt-1">신청 내용을 확인하고 약관에 동의해주세요.</p>
      </div>

      {/* Summary */}
      <SummaryCard draft={draft} />

      {/* Agreement checkboxes */}
      <div className="space-y-3">
        {(!draft.termsAccepted || !draft.privacyAccepted) && (
          <button
            type="button"
            onClick={handleAgreeAll}
            className="w-full py-2.5 rounded-2xl border border-[#0669F7] text-[#0669F7] text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            전체 동의
          </button>
        )}

        {/* Terms of service */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.termsAccepted}
            onChange={(e) => onChange({ termsAccepted: e.target.checked })}
            className="mt-0.5 w-5 h-5 rounded border-[#EFF1F5] text-[#0669F7] accent-[#0669F7] cursor-pointer flex-shrink-0"
          />
          <div className="flex-1 flex items-center justify-between gap-2">
            <span className="text-sm text-[#25282A]">이용약관에 동의합니다</span>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#0669F7] underline flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              보기
            </a>
          </div>
        </label>

        {/* Privacy policy */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.privacyAccepted}
            onChange={(e) => onChange({ privacyAccepted: e.target.checked })}
            className="mt-0.5 w-5 h-5 rounded border-[#EFF1F5] text-[#0669F7] accent-[#0669F7] cursor-pointer flex-shrink-0"
          />
          <div className="flex-1 flex items-center justify-between gap-2">
            <span className="text-sm text-[#25282A]">개인정보처리방침에 동의합니다</span>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#0669F7] underline flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              보기
            </a>
          </div>
        </label>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-[#ED1C24]">
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="w-full py-3.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm disabled:opacity-40"
        >
          이전
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="w-full py-3.5 rounded-full bg-[#0669F7] text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              신청 중...
            </>
          ) : (
            '매니저 등록 신청'
          )}
        </button>
      </div>
    </div>
  )
}
