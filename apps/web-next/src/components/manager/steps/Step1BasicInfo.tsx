'use client'

import * as React from 'react'
import { ManagerDraft } from '@/types/manager-application'

interface Props {
  draft: ManagerDraft
  onChange: (partial: Partial<ManagerDraft>) => void
  onNext: () => void
}

const MAX_FILE_SIZE = 20 * 1024 * 1024

const inputClass =
  'w-full px-3 py-2.5 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] bg-white'
const labelClass = 'block text-sm font-medium text-[#25282A] mb-1.5'

export default function Step1BasicInfo({ draft, onChange, onNext }: Props) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = React.useState<string | null>(null)

  const isCorporate = draft.businessType === 'CORPORATE'
  const canNext =
    draft.businessType !== '' &&
    draft.representativeName.trim() !== '' &&
    draft.representativeDob.trim() !== '' &&
    draft.representativeGender !== '' &&
    (!isCorporate || draft.companyName.trim() !== '')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setFileError('파일 크기는 20MB 이하여야 합니다.')
      return
    }
    setFileError(null)
    onChange({ businessRegDoc: file })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">기본 정보</h2>
        <p className="text-sm text-[#98A2B2] mt-1">사업자 유형과 대표자 정보를 입력해주세요.</p>
      </div>

      {/* ── Business type ─────────────────────────────── */}
      <div>
        <p className={labelClass}>
          사업자 유형 <span className="text-[#D81A48]">*</span>
        </p>
        <div className="flex gap-3">
          {[
            {
              value: 'INDIVIDUAL' as const,
              label: '개인사업자',
              sub: '개인 사업자 등록증 보유',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ),
            },
            {
              value: 'CORPORATE' as const,
              label: '법인사업자',
              sub: '법인 등록증 보유',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
            },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ businessType: opt.value })}
              className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                draft.businessType === opt.value
                  ? 'border-[#0669F7] bg-blue-50 text-[#0669F7]'
                  : 'border-[#EFF1F5] bg-white text-[#98A2B2] hover:border-[#0669F7]'
              }`}
            >
              {opt.icon}
              <div className="text-center">
                <p className="text-sm font-semibold text-[#25282A]">{opt.label}</p>
                <p className="text-xs text-[#98A2B2] mt-0.5">{opt.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Company name (CORPORATE only) ──────────────── */}
      {isCorporate && (
        <div>
          <label htmlFor="companyName" className={labelClass}>
            회사명 <span className="text-[#D81A48]">*</span>
          </label>
          <input
            id="companyName"
            type="text"
            value={draft.companyName}
            onChange={(e) => onChange({ companyName: e.target.value })}
            placeholder="회사명을 입력하세요"
            className={inputClass}
          />
        </div>
      )}

      {/* ── Representative name ────────────────────────── */}
      <div>
        <label htmlFor="representativeName" className={labelClass}>
          대표자 성명 <span className="text-[#D81A48]">*</span>
        </label>
        <input
          id="representativeName"
          type="text"
          value={draft.representativeName}
          onChange={(e) => onChange({ representativeName: e.target.value })}
          placeholder="대표자 이름을 입력하세요"
          className={inputClass}
        />
      </div>

      {/* ── Representative DOB ─────────────────────────── */}
      <div>
        <label htmlFor="representativeDob" className={labelClass}>
          생년월일 <span className="text-[#D81A48]">*</span>
        </label>
        <input
          id="representativeDob"
          type="date"
          value={draft.representativeDob}
          onChange={(e) => onChange({ representativeDob: e.target.value })}
          className={inputClass}
        />
      </div>

      {/* ── Representative gender ──────────────────────── */}
      <div>
        <label htmlFor="representativeGender" className={labelClass}>
          성별 <span className="text-[#D81A48]">*</span>
        </label>
        <select
          id="representativeGender"
          value={draft.representativeGender}
          onChange={(e) => onChange({ representativeGender: e.target.value as 'MALE' | 'FEMALE' | 'OTHER' | '' })}
          className={inputClass}
        >
          <option value="">선택해주세요</option>
          <option value="MALE">남성</option>
          <option value="FEMALE">여성</option>
          <option value="OTHER">기타</option>
        </select>
      </div>

      {/* ── Contact phone ──────────────────────────────── */}
      <div>
        <label htmlFor="contactPhone" className={labelClass}>
          연락처
          <span className="ml-1 text-xs font-normal text-[#98A2B2]">(선택)</span>
        </label>
        <input
          id="contactPhone"
          type="tel"
          value={draft.contactPhone}
          onChange={(e) => onChange({ contactPhone: e.target.value })}
          placeholder="+84 901 234 567"
          className={inputClass}
        />
      </div>

      {/* ── Contact address ────────────────────────────── */}
      <div>
        <label htmlFor="contactAddress" className={labelClass}>
          사업장 주소
          <span className="ml-1 text-xs font-normal text-[#98A2B2]">(선택)</span>
        </label>
        <input
          id="contactAddress"
          type="text"
          value={draft.contactAddress}
          onChange={(e) => onChange({ contactAddress: e.target.value })}
          placeholder="사업장 또는 주요 활동 주소"
          className={inputClass}
        />
      </div>

      {/* ── Business reg number ────────────────────────── */}
      <div>
        <label htmlFor="businessRegNumber" className={labelClass}>
          사업자 등록번호
          <span className="ml-1 text-xs font-normal text-[#98A2B2]">(선택)</span>
        </label>
        <input
          id="businessRegNumber"
          type="text"
          value={draft.businessRegNumber}
          onChange={(e) => onChange({ businessRegNumber: e.target.value })}
          placeholder="000-00-00000 (한국) / 0123456789 (베트남)"
          className={inputClass}
        />
      </div>

      {/* ── Business reg document ──────────────────────── */}
      <div>
        <label className={labelClass}>
          사업자 등록증
          <span className="ml-1 text-xs font-normal text-[#98A2B2]">(선택)</span>
        </label>
        {draft.businessRegDocUrl && !draft.businessRegDoc && (
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-700">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              기존 서류 첨부됨
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`w-full px-3 py-3 rounded-2xl border-2 border-dashed text-sm transition-colors flex items-center justify-center gap-2 ${
            draft.businessRegDoc
              ? 'border-[#0669F7] text-[#0669F7] bg-blue-50'
              : 'border-[#EFF1F5] text-[#98A2B2] hover:border-[#0669F7]'
          }`}
        >
          {draft.businessRegDoc ? (
            <>
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs truncate max-w-[200px]">{draft.businessRegDoc.name}</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>파일 업로드 (PDF, JPG, PNG · 최대 20MB)</span>
            </>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
        {fileError && <p className="text-xs text-[#D81A48] mt-1">{fileError}</p>}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="w-full py-3.5 rounded-full bg-[#0669F7] text-white font-semibold text-sm disabled:opacity-40"
      >
        다음
      </button>
    </div>
  )
}
