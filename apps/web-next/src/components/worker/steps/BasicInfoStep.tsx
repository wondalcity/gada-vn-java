'use client'

import * as React from 'react'
import { ProfileDraft } from '@/types/worker-profile'

interface BasicInfoStepProps {
  draft: ProfileDraft
  onChange: (partial: Partial<ProfileDraft>) => void
  onNext: () => Promise<void>
  isSaving: boolean
}

// Max date = today minus 15 years
function getMaxBirthDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 15)
  return d.toISOString().split('T')[0]
}

type GenderOption = 'MALE' | 'FEMALE' | 'OTHER'

const GENDER_OPTIONS: { value: GenderOption; label: string }[] = [
  { value: 'MALE',   label: '남성' },
  { value: 'FEMALE', label: '여성' },
  { value: 'OTHER',  label: '기타' },
]

export default function BasicInfoStep({ draft, onChange, onNext, isSaving }: BasicInfoStepProps) {
  const maxDate = getMaxBirthDate()

  const isNextDisabled =
    !draft.fullName.trim() ||
    !draft.dateOfBirth ||
    !draft.gender ||
    isSaving

  async function handleNext() {
    if (isNextDisabled) return
    await onNext()
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">기본 정보</h2>
        <p className="text-sm text-[#98A2B2] mt-1">프로필의 기본 정보를 입력해주세요.</p>
      </div>

      {/* Full name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-[#25282A] mb-1">
          이름 <span className="text-[#ED1C24]">*</span>
        </label>
        <input
          id="fullName"
          type="text"
          value={draft.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          placeholder="이름을 입력하세요"
          className="w-full px-3 py-3 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] min-h-[44px]"
        />
      </div>

      {/* Date of birth */}
      <div>
        <label htmlFor="dateOfBirth" className="block text-sm font-medium text-[#25282A] mb-1">
          생년월일 <span className="text-[#ED1C24]">*</span>
        </label>
        <input
          id="dateOfBirth"
          type="date"
          value={draft.dateOfBirth}
          max={maxDate}
          onChange={(e) => onChange({ dateOfBirth: e.target.value })}
          className="w-full px-3 py-3 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] min-h-[44px]"
        />
      </div>

      {/* Gender */}
      <div>
        <p className="block text-sm font-medium text-[#25282A] mb-2">
          성별 <span className="text-[#ED1C24]">*</span>
        </p>
        <div className="flex gap-3">
          {GENDER_OPTIONS.map((opt) => {
            const isSelected = draft.gender === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ gender: opt.value })}
                className={`
                  flex-1 flex items-center justify-center py-3.5 rounded-2xl border-2
                  transition-all duration-150 min-h-[52px]
                  ${isSelected
                    ? 'border-[#0669F7] bg-blue-50 text-[#0669F7]'
                    : 'border-[#EFF1F5] bg-white text-[#98A2B2] hover:border-[#0669F7] hover:text-[#0669F7]'
                  }
                `}
              >
                <span className="text-sm font-semibold">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-[#25282A] mb-1">
          자기소개
          <span className="ml-1 text-xs text-[#98A2B2] font-normal">(선택)</span>
        </label>
        <textarea
          id="bio"
          rows={3}
          maxLength={500}
          value={draft.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          placeholder="간단한 자기소개를 입력하세요 (최대 500자)"
          className="w-full px-3 py-3 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] resize-none"
        />
        <p className="text-xs text-[#98A2B2] mt-1 text-right">{draft.bio.length}/500</p>
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={isNextDisabled}
        className="w-full py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
      >
        {isSaving ? '저장 중...' : '다음'}
      </button>
    </div>
  )
}
