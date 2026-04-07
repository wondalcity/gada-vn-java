'use client'

import * as React from 'react'
import { ProfileDraft, Trade } from '@/types/worker-profile'

interface ExperienceStepProps {
  draft: ProfileDraft
  onChange: (partial: Partial<ProfileDraft>) => void
  onNext: () => Promise<void>
  isSaving: boolean
}

function formatMonths(months: number): string {
  if (months === 0) return '신입'
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem}개월`
  if (rem === 0) return `${years}년`
  return `${years}년 ${rem}개월`
}

function TradeSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 bg-[#EFF1F5] rounded-2xl animate-pulse" />
      ))}
    </div>
  )
}

export default function ExperienceStep({ draft, onChange, onNext, isSaving }: ExperienceStepProps) {
  const [trades, setTrades] = React.useState<Trade[]>([])
  const [isLoadingTrades, setIsLoadingTrades] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [fetchError, setFetchError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'
    fetch(`${API_BASE}/public/trades`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.message ?? '직종 목록을 불러오지 못했습니다.')
        const data: Trade[] = body.data ?? body
        setTrades(data)
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '직종 목록을 불러오지 못했습니다.'
        setFetchError(msg)
      })
      .finally(() => setIsLoadingTrades(false))
  }, [])

  const filteredTrades = React.useMemo(() => {
    if (!searchQuery.trim()) return trades
    const q = searchQuery.trim().toLowerCase()
    return trades.filter((t) => t.nameKo.toLowerCase().includes(q))
  }, [trades, searchQuery])

  const selectedTrade = trades.find((t) => t.id === draft.primaryTradeId)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">경력 및 직종</h2>
        <p className="text-sm text-[#98A2B2] mt-1">주요 직종과 경력을 선택해주세요.</p>
      </div>

      {/* Selected trade summary */}
      {selectedTrade && (
        <div className="flex items-center gap-2 p-3 bg-[#E6F0FE] border border-[#0669F7] rounded-2xl">
          <svg className="w-4 h-4 text-[#0669F7] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-[#0669F7]">{selectedTrade.nameKo}</p>
            <p className="text-xs text-[#98A2B2]">{selectedTrade.nameVi}</p>
          </div>
        </div>
      )}

      {/* Search box */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 0 5 11a6 6 0 0 0 12 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="직종 검색 (예: 도장, 용접...)"
          className="w-full pl-9 pr-3 py-3 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
        />
      </div>

      {/* Trade list */}
      <div className="max-h-60 overflow-y-auto rounded-2xl border border-[#EFF1F5]">
        {isLoadingTrades ? (
          <div className="p-3">
            <TradeSkeleton />
          </div>
        ) : fetchError ? (
          <div className="p-4 text-sm text-[#ED1C24]">{fetchError}</div>
        ) : filteredTrades.length === 0 ? (
          <div className="p-4 text-sm text-[#98A2B2] text-center">검색 결과가 없습니다.</div>
        ) : (
          <ul>
            {filteredTrades.map((trade) => {
              const isSelected = draft.primaryTradeId === trade.id
              return (
                <li key={trade.id}>
                  <button
                    type="button"
                    onClick={() => onChange({ primaryTradeId: trade.id })}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 text-left
                      hover:bg-[#F2F4F5] transition-colors border-b border-[#EFF1F5] last:border-0
                      ${isSelected ? 'bg-[#E6F0FE]' : ''}
                    `}
                  >
                    <div>
                      <p className={`text-sm font-medium ${isSelected ? 'text-[#0669F7]' : 'text-[#25282A]'}`}>
                        {trade.nameKo}
                      </p>
                      <p className="text-xs text-[#98A2B2]">{trade.nameVi}</p>
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4 text-[#0669F7] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Experience slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="experienceSlider" className="text-sm font-medium text-[#25282A]">
            시공 경력
          </label>
          <span className="text-sm font-semibold text-[#0669F7]">
            {formatMonths(draft.experienceMonths)}
          </span>
        </div>
        <input
          id="experienceSlider"
          type="range"
          min={0}
          max={300}
          step={1}
          value={draft.experienceMonths}
          onChange={(e) => onChange({ experienceMonths: Number(e.target.value) })}
          className="w-full accent-[#0669F7] cursor-pointer"
        />
        <div className="flex justify-between text-xs text-[#98A2B2] mt-1">
          <span>신입</span>
          <span>25년+</span>
        </div>
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={onNext}
        disabled={isSaving}
        className="w-full py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40 hover:bg-[#0557D4] transition-colors"
      >
        {isSaving ? '저장 중...' : '다음'}
      </button>
    </div>
  )
}
