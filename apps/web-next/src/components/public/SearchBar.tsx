'use client'

import { useRouter } from '@/i18n/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Province, Trade } from '@/lib/api/public'

interface Props {
  provinces: Province[]
  trades?: Trade[]
  locale: string
}

export function SearchBar({ provinces, trades = [], locale }: Props) {
  const router = useRouter()
  const t = useTranslations('landing')
  const [keyword, setKeyword] = useState('')
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedTrade, setSelectedTrade] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (keyword.trim()) params.set('q', keyword.trim())
    if (selectedProvince) params.set('province', selectedProvince)
    if (selectedTrade) params.set('trade', selectedTrade)
    params.set('view', 'map')
    router.push(`/${locale}/jobs?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto space-y-2">
      {/* Keyword row */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <svg className="w-4 h-4 text-[#98A2B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          type="text"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder={t('hero.search_placeholder')}
          className="w-full pl-9 pr-3 py-3 rounded-xl bg-white text-[#25282A] text-sm border-0 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg placeholder:text-[#98A2B2]"
        />
      </div>

      {/* Filter row + submit */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={selectedProvince}
          onChange={e => setSelectedProvince(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl bg-white text-[#25282A] text-sm border-0 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
        >
          <option value="">{t('hero.all_provinces')}</option>
          {provinces.map(p => (
            <option key={p.slug} value={p.slug}>{p.nameVi}</option>
          ))}
        </select>
        {trades.length > 0 && (
          <select
            value={selectedTrade}
            onChange={e => setSelectedTrade(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-white text-[#25282A] text-sm border-0 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
          >
            <option value="">{t('hero.all_trades')}</option>
            {trades.map(tr => (
              <option key={tr.id} value={String(tr.id)}>{tr.nameKo}</option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-white text-[#0669F7] font-bold text-sm hover:bg-blue-50 transition-colors shadow-lg shrink-0 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          {t('hero.map_view')}
        </button>
      </div>
    </form>
  )
}
