'use client'

import * as React from 'react'
import { ManagerDraft } from '@/types/manager-application'

interface Props {
  draft: ManagerDraft
  onChange: (partial: Partial<ManagerDraft>) => void
  onNext: () => void
}

function PersonIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  )
}

export default function BusinessTypeStep({ draft, onChange, onNext }: Props) {
  const canNext = draft.businessType !== ''

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">사업자 유형 선택</h2>
        <p className="text-sm text-[#98A2B2] mt-1">해당하는 사업자 유형을 선택해주세요.</p>
      </div>

      <div className="flex gap-3">
        {/* Individual */}
        <button
          type="button"
          onClick={() => onChange({ businessType: 'INDIVIDUAL' })}
          className={`flex-1 p-5 rounded-2xl cursor-pointer transition-all flex flex-col items-center gap-3 border-2 ${
            draft.businessType === 'INDIVIDUAL'
              ? 'border-[#0669F7] bg-blue-50 text-[#0669F7]'
              : 'border-[#EFF1F5] bg-white text-[#98A2B2] hover:border-[#0669F7] hover:text-[#0669F7]'
          }`}
        >
          <PersonIcon />
          <div className="text-center">
            <p className="text-sm font-semibold text-[#25282A]">개인사업자</p>
            <p className="text-xs text-[#98A2B2] mt-0.5">개인 사업자 등록증 보유</p>
          </div>
        </button>

        {/* Corporate */}
        <button
          type="button"
          onClick={() => onChange({ businessType: 'CORPORATE' })}
          className={`flex-1 p-5 rounded-2xl cursor-pointer transition-all flex flex-col items-center gap-3 border-2 ${
            draft.businessType === 'CORPORATE'
              ? 'border-[#0669F7] bg-blue-50 text-[#0669F7]'
              : 'border-[#EFF1F5] bg-white text-[#98A2B2] hover:border-[#0669F7] hover:text-[#0669F7]'
          }`}
        >
          <BuildingIcon />
          <div className="text-center">
            <p className="text-sm font-semibold text-[#25282A]">법인사업자</p>
            <p className="text-xs text-[#98A2B2] mt-0.5">법인 등록증 보유</p>
          </div>
        </button>
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
