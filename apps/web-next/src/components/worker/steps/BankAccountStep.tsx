'use client'

import * as React from 'react'
import { ProfileDraft } from '@/types/worker-profile'

interface BankAccountStepProps {
  draft: ProfileDraft
  onChange: (partial: Partial<ProfileDraft>) => void
  onNext: () => Promise<void>
  isSaving: boolean
}

export default function BankAccountStep({ draft, onChange, onNext, isSaving }: BankAccountStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">계좌 정보</h2>
        <p className="text-sm text-[#98A2B2] mt-1">급여 지급 시 사용됩니다.</p>
      </div>

      {/* Bank name */}
      <div>
        <label htmlFor="bankName" className="block text-sm font-medium text-[#25282A] mb-1">
          은행명
        </label>
        <input
          id="bankName"
          type="text"
          value={draft.bankName}
          onChange={(e) => onChange({ bankName: e.target.value })}
          placeholder="예: Vietcombank, BIDV, Agribank..."
          className="w-full px-3 py-3 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] min-h-[44px]"
        />
      </div>

      {/* Account number */}
      <div>
        <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-[#25282A] mb-1">
          계좌번호
        </label>
        <input
          id="bankAccountNumber"
          type="text"
          value={draft.bankAccountNumber}
          onChange={(e) => onChange({ bankAccountNumber: e.target.value })}
          placeholder="계좌번호를 입력하세요"
          className="w-full px-3 py-3 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] min-h-[44px]"
        />
      </div>

      {/* Helper text */}
      <p className="text-xs text-[#98A2B2] bg-[#F2F4F5] rounded-2xl p-3 border border-[#EFF1F5]">
        계좌 정보는 급여 지급 및 정산 시에만 사용됩니다. 언제든지 수정할 수 있습니다.
      </p>

      {/* Nav buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onNext}
          className="text-sm text-[#98A2B2] hover:text-[#0669F7] underline-offset-2 hover:underline transition-colors"
        >
          건너뛰기
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isSaving}
          className="px-8 py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40 hover:bg-[#0557D4] transition-colors"
        >
          {isSaving ? '저장 중...' : '다음'}
        </button>
      </div>
    </div>
  )
}
