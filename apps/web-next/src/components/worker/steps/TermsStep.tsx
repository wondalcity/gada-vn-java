'use client'

import * as React from 'react'
import { ProfileDraft } from '@/types/worker-profile'

interface TermsStepProps {
  draft: ProfileDraft
  onChange: (partial: Partial<ProfileDraft>) => void
  onComplete: () => Promise<void>
  isSaving: boolean
}

interface SummaryItem {
  icon: React.ReactNode
  label: string
  value: string | null
  filled: boolean
}

function buildSummaryItems(draft: ProfileDraft): SummaryItem[] {
  return [
    {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
      label: '기본정보',
      value: draft.fullName || null,
      filled: Boolean(draft.fullName && draft.dateOfBirth && draft.gender),
    },
    {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
      label: '경력',
      value: draft.primaryTradeId ? `직종 선택됨` : null,
      filled: draft.primaryTradeId !== null,
    },
    {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      label: '주소',
      value: draft.currentProvince || null,
      filled: Boolean(draft.currentProvince),
    },
    {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" /></svg>,
      label: '신분증',
      value: draft.idFrontUrl ? '서류 제출됨' : null,
      filled: Boolean(draft.idFrontUrl || draft.idBackUrl),
    },
    {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
      label: '서명',
      value: draft.signatureUrl ? '서명 완료' : null,
      filled: Boolean(draft.signatureUrl),
    },
    {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
      label: '계좌',
      value: draft.bankName || null,
      filled: Boolean(draft.bankName && draft.bankAccountNumber),
    },
  ]
}

export default function TermsStep({ draft, onChange, onComplete, isSaving }: TermsStepProps) {
  const [error, setError] = React.useState<string | null>(null)
  const summaryItems = buildSummaryItems(draft)

  function handleAgreeAll() {
    onChange({ termsAccepted: true, privacyAccepted: true })
  }

  async function handleComplete() {
    if (!draft.termsAccepted || !draft.privacyAccepted) {
      setError('이용약관 및 개인정보처리방침에 동의해주세요.')
      return
    }
    setError(null)
    await onComplete()
  }

  const canComplete = draft.termsAccepted && draft.privacyAccepted

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">프로필 완성</h2>
        <p className="text-sm text-[#98A2B2] mt-1">약관에 동의하고 프로필을 완성하세요.</p>
      </div>

      {/* Summary card */}
      <div className="bg-gray-50 border border-[#EFF1F5] rounded-2xl p-4">
        <p className="text-sm font-medium text-[#25282A] mb-3">입력 완료 항목</p>
        <ul className="space-y-2">
          {summaryItems.map((item) => (
            <li key={item.label} className="flex items-center gap-3">
              <span className="w-6 flex items-center justify-center text-[#98A2B2] flex-shrink-0">{item.icon}</span>
              <span className="text-sm text-[#25282A] flex-1">{item.label}</span>
              {item.filled ? (
                <span className="flex items-center gap-1 text-xs text-green-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {item.value ?? '완료'}
                </span>
              ) : (
                <span className="text-xs text-[#98A2B2]">미입력</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Terms checkboxes */}
      <div className="space-y-3">
        {/* Agree all button */}
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

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-[#ED1C24]">
          {error}
        </div>
      )}

      {/* Complete button */}
      <button
        type="button"
        onClick={handleComplete}
        disabled={!canComplete || isSaving}
        className="w-full py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
      >
        {isSaving ? '저장 중...' : '프로필 완성하기'}
      </button>
    </div>
  )
}
