'use client'

import * as React from 'react'
import { ManagerDraft } from '@/types/manager-application'
import { DatePicker } from '@/components/ui/DatePicker'

interface Props {
  draft: ManagerDraft
  onChange: (partial: Partial<ManagerDraft>) => void
  onNext: () => void
  onBack: () => void
}

type GenderOption = 'MALE' | 'FEMALE' | 'OTHER'

const GENDER_OPTIONS: { value: GenderOption; label: string }[] = [
  { value: 'MALE',   label: '남성' },
  { value: 'FEMALE', label: '여성' },
  { value: 'OTHER',  label: '기타' },
]

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

export default function RepresentativeInfoStep({ draft, onChange, onNext, onBack }: Props) {
  const canNext = draft.representativeName.trim() !== ''
  const today = getTodayString()

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">대표자 정보</h2>
        <p className="text-sm text-[#98A2B2] mt-1">대표자의 개인 정보를 입력해주세요.</p>
      </div>

      {/* Representative name */}
      <div>
        <label htmlFor="representativeName" className="block text-sm font-medium text-[#25282A] mb-1.5">
          대표자 성명 <span className="text-[#ED1C24]">*</span>
        </label>
        <input
          id="representativeName"
          type="text"
          value={draft.representativeName}
          onChange={(e) => onChange({ representativeName: e.target.value })}
          placeholder="대표자 이름을 입력하세요"
          className="w-full px-3 py-2.5 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
        />
      </div>

      {/* Date of birth */}
      <div>
        <label className="block text-sm font-medium text-[#25282A] mb-1.5">
          생년월일
          <span className="ml-1 text-xs text-[#98A2B2] font-normal">(선택)</span>
        </label>
        <DatePicker
          value={draft.representativeDob}
          max={today}
          onChange={v => onChange({ representativeDob: v })}
          placeholder="생년월일 선택"
        />
      </div>

      {/* Gender */}
      <div>
        <p className="block text-sm font-medium text-[#25282A] mb-2">
          성별
          <span className="ml-1 text-xs text-[#98A2B2] font-normal">(선택)</span>
        </p>
        <div className="flex gap-3">
          {GENDER_OPTIONS.map((opt) => {
            const isSelected = draft.representativeGender === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ representativeGender: opt.value })}
                className={`
                  flex-1 flex items-center justify-center py-3.5 rounded-2xl border-2
                  transition-all duration-150 min-h-[52px]
                  ${isSelected
                    ? 'border-[#0669F7] bg-[#E6F0FE] text-[#0669F7]'
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

      {/* Contact phone */}
      <div>
        <label htmlFor="contactPhone" className="block text-sm font-medium text-[#25282A] mb-1.5">
          연락처
          <span className="ml-1 text-xs text-[#98A2B2] font-normal">(선택)</span>
        </label>
        <input
          id="contactPhone"
          type="tel"
          value={draft.contactPhone}
          onChange={(e) => onChange({ contactPhone: e.target.value })}
          placeholder="+84 901 234 567"
          className="w-full px-3 py-2.5 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
        />
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm"
        >
          이전
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="w-full py-3.5 rounded-full bg-[#0669F7] text-white font-semibold text-sm hover:bg-[#0557D4] disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  )
}
