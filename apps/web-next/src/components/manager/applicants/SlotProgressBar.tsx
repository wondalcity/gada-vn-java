'use client'

import * as React from 'react'

interface Props {
  slotsFilled: number
  slotsTotal: number
  jobStatus: string
}

export default function SlotProgressBar({ slotsFilled, slotsTotal, jobStatus }: Props) {
  const progress = slotsTotal > 0 ? Math.min((slotsFilled / slotsTotal) * 100, 100) : 0

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${slotsFilled === 0 ? 'text-[#98A2B2]' : 'text-[#25282A]'}`}>
          {slotsFilled}/{slotsTotal}명 선발됨
        </span>
        {jobStatus === 'FILLED' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            모집 완료
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-[#0669F7] h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
