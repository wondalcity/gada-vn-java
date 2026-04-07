'use client'

import * as React from 'react'
import { ManagerDraft } from '@/types/manager-application'

interface Props {
  draft: ManagerDraft
  onChange: (partial: Partial<ManagerDraft>) => void
  onNext: () => void
  onBack: () => void
}

export default function SiteInfoStep({ draft, onChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">현장 정보</h2>
        <p className="text-sm text-[#98A2B2] mt-1">
          관리하실 첫 번째 현장 정보를 입력해주세요. 승인 후 현장을 추가로 등록할 수 있습니다.
        </p>
      </div>

      {/* Site name */}
      <div>
        <label htmlFor="firstSiteName" className="block text-sm font-medium text-[#25282A] mb-1.5">
          현장명
          <span className="ml-1 text-xs text-[#98A2B2] font-normal">(선택)</span>
        </label>
        <input
          id="firstSiteName"
          type="text"
          value={draft.firstSiteName}
          onChange={(e) => onChange({ firstSiteName: e.target.value })}
          placeholder="예: 한강 아파트 3공구"
          className="w-full px-3 py-2.5 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
        />
      </div>

      {/* Site address */}
      <div>
        <label htmlFor="firstSiteAddress" className="block text-sm font-medium text-[#25282A] mb-1.5">
          현장 주소
          <span className="ml-1 text-xs text-[#98A2B2] font-normal">(선택)</span>
        </label>
        <textarea
          id="firstSiteAddress"
          rows={2}
          value={draft.firstSiteAddress}
          onChange={(e) => onChange({ firstSiteAddress: e.target.value })}
          placeholder="현장 주소를 입력하세요"
          className="w-full px-3 py-2.5 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] resize-none"
        />
      </div>

      {/* Contact address */}
      <div>
        <label htmlFor="contactAddress" className="block text-sm font-medium text-[#25282A] mb-1.5">
          연락 주소 (사무소)
          <span className="ml-1 text-xs text-[#98A2B2] font-normal">(선택)</span>
        </label>
        <input
          id="contactAddress"
          type="text"
          value={draft.contactAddress}
          onChange={(e) => onChange({ contactAddress: e.target.value })}
          placeholder="사무소 또는 연락 주소"
          className="w-full px-3 py-2.5 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
        />
      </div>

      {/* Province */}
      <div>
        <label htmlFor="province" className="block text-sm font-medium text-[#25282A] mb-1.5">
          지역 (성/시)
          <span className="ml-1 text-xs text-[#98A2B2] font-normal">(선택)</span>
        </label>
        <input
          id="province"
          type="text"
          value={draft.province}
          onChange={(e) => onChange({ province: e.target.value })}
          placeholder="예: Hà Nội, TP. Hồ Chí Minh"
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
        <div className="flex-1 flex items-center gap-3">
          <button
            type="button"
            onClick={onNext}
            className="text-sm text-[#98A2B2] hover:text-[#0669F7] underline-offset-2 hover:underline transition-colors whitespace-nowrap"
          >
            건너뛰기
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex-1 py-3.5 rounded-full bg-[#0669F7] text-white font-semibold hover:bg-[#0557D4] transition-colors text-sm"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  )
}
