'use client'

import { useRouter } from '@/i18n/navigation'
import { useState, useRef, useEffect, useId } from 'react'
import { useTranslations } from 'next-intl'
import type { Province, Trade } from '@/lib/api/public'

interface Props {
  provinces: Province[]
  trades?: Trade[]
  locale: string
}

// ── Generic custom select (desktop dropdown + mobile bottom sheet) ────────────

interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  options: SelectOption[]
  value: string
  onChange: (v: string) => void
  placeholder: string
  mobileTitle: string
}

function CustomSelect({ options, value, onChange, placeholder, mobileTitle }: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()

  const selectedLabel = options.find(o => o.value === value)?.label ?? ''

  // Close on outside click (desktop)
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Lock scroll when bottom sheet open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div ref={ref} className="relative flex-1">
      {/* Trigger */}
      <button
        id={id}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-white text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0669F7]/40 transition-colors"
      >
        <span className={value ? 'text-[#25282A] font-medium' : 'text-[#98A2B2]'}>
          {value ? selectedLabel : placeholder}
        </span>
        <svg className={`w-4 h-4 shrink-0 text-[#98A2B2] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Desktop dropdown */}
      {open && (
        <div className="hidden sm:block absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-[#EFF1F5] z-[100] overflow-hidden max-h-64 overflow-y-auto"
          role="listbox"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
        >
          {[{ value: '', label: placeholder }, ...options].map(opt => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-[#F2F4F5] last:border-0 ${
                value === opt.value
                  ? 'bg-[#E6F0FE] text-[#0669F7] font-semibold'
                  : 'text-[#25282A] hover:bg-[#F2F4F5]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-[150] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          {/* Sheet */}
          <div
            className="relative bg-white rounded-t-3xl z-10 flex flex-col"
            style={{ maxHeight: '70vh', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            {/* Handle + title */}
            <div className="shrink-0 pt-3 pb-4 px-5 border-b border-[#F2F4F5]">
              <div className="w-8 h-1 rounded-full bg-[#DDDDDD] mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-[#25282A]">{mobileTitle}</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#EFF1F5]"
                >
                  <svg className="w-5 h-5 text-[#7A7B7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Options */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1.5">
              {[{ value: '', label: placeholder }, ...options].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors ${
                    value === opt.value
                      ? 'bg-[#E6F0FE] text-[#0669F7] border-2 border-[#0669F7]'
                      : 'bg-[#F2F4F5] text-[#25282A] border-2 border-transparent'
                  }`}
                >
                  <span>{opt.label}</span>
                  {value === opt.value && (
                    <svg className="w-5 h-5 text-[#0669F7] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SearchBar ─────────────────────────────────────────────────────────────────

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
    router.push(`/jobs?${params.toString()}`)
  }

  const provinceOptions: SelectOption[] = provinces.map(p => ({
    value: p.slug,
    label: p.nameVi,
  }))

  const tradeOptions: SelectOption[] = trades.map(tr => ({
    value: String(tr.id),
    label: tr.nameKo,
  }))

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
        <CustomSelect
          options={provinceOptions}
          value={selectedProvince}
          onChange={setSelectedProvince}
          placeholder={t('hero.all_provinces')}
          mobileTitle={t('hero.all_provinces')}
        />
        {trades.length > 0 && (
          <CustomSelect
            options={tradeOptions}
            value={selectedTrade}
            onChange={setSelectedTrade}
            placeholder={t('hero.all_trades')}
            mobileTitle={t('hero.all_trades')}
          />
        )}
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-white text-[#0669F7] font-bold text-sm hover:bg-[#E6F0FE] transition-colors shadow-lg shrink-0 flex items-center gap-2"
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
