'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

export interface TimePickerProps {
  value: string        // 'HH:MM' 24h or ''
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

function parse(value: string): { period: 'AM' | 'PM'; hour: string; minute: string } {
  if (!value) return { period: 'AM', hour: '06', minute: '00' }
  const [hStr, mStr] = value.split(':')
  const h = parseInt(hStr, 10)
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return { period, hour: String(h12).padStart(2, '0'), minute: mStr?.slice(0, 2) ?? '00' }
}

function to24h(period: 'AM' | 'PM', hour: string, minute: string): string {
  let h = parseInt(hour, 10)
  if (period === 'AM' && h === 12) h = 0
  else if (period === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${minute}`
}

export function TimePicker({
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
}: TimePickerProps) {
  const t = useTranslations('common.time_picker')
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [fixedTop, setFixedTop] = React.useState(0)
  const [fixedLeft, setFixedLeft] = React.useState(0)

  const { period, hour, minute } = parse(value)

  const nearestMinute = MINUTES.includes(minute)
    ? minute
    : MINUTES.reduce((best, m) =>
        Math.abs(parseInt(m) - parseInt(minute)) < Math.abs(parseInt(best) - parseInt(minute)) ? m : best
      , MINUTES[0])

  // Close on outside click, scroll, or resize — same pattern as DatePicker
  React.useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const picker = document.getElementById('timepicker-portal')
        if (picker && picker.contains(e.target as Node)) return
        setOpen(false)
      }
    }
    function handleClose() { setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [open])

  function openPicker() {
    if (disabled) return
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const pickerH = 340
      const pickerW = 280
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const top = spaceBelow >= pickerH
        ? rect.bottom + 6
        : Math.max(8, rect.top - pickerH - 6)
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - pickerW - 16))
      setFixedTop(top)
      setFixedLeft(left)
    }
    setOpen(true)
  }

  const amLabel = t('am')
  const pmLabel = t('pm')
  const displayValue = value ? `${period === 'AM' ? amLabel : pmLabel} ${hour}:${nearestMinute}` : ''

  const inputBase = `w-full px-3 py-2.5 rounded-2xl border text-sm bg-white flex items-center justify-between cursor-pointer transition-colors ${
    disabled
      ? 'border-[#EFF1F5] bg-[#F2F4F5] cursor-not-allowed text-[#98A2B2]'
      : 'border-[#EFF1F5] text-[#25282A] hover:border-[#0669F7]'
  } ${open ? 'border-[#0669F7] ring-2 ring-[#0669F7]/10' : ''} ${className}`

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className={inputBase}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? 'text-[#25282A]' : 'text-[#98A2B2]'}>
          {value ? displayValue : (placeholder ?? t('title'))}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 transition-colors ${open ? 'text-[#0669F7]' : 'text-[#98A2B2]'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Dropdown — fixed position to escape overflow:hidden parents, same as DatePicker */}
      {open && (
        <div
          id="timepicker-portal"
          role="dialog"
          aria-modal="true"
          className="bg-white rounded-2xl shadow-2xl border border-[#EFF1F5] overflow-hidden"
          style={{ position: 'fixed', top: fixedTop, left: fixedLeft, zIndex: 9999, width: 280 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#EFF1F5]">
            <span className="text-sm font-semibold text-[#25282A]">{t('title')}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-[#0669F7] hover:underline"
            >
              {t('confirm')}
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* AM / PM toggle */}
            <div className="grid grid-cols-2 gap-2">
              {(['AM', 'PM'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange(to24h(p, hour, nearestMinute))}
                  className={`py-2 rounded-xl text-sm font-semibold transition-all ${
                    period === p
                      ? 'bg-[#0669F7] text-white shadow-sm'
                      : 'bg-[#F2F4F5] text-[#25282A] hover:bg-[#E6F0FE] hover:text-[#0669F7]'
                  }`}
                >
                  {p === 'AM' ? amLabel : pmLabel}
                </button>
              ))}
            </div>

            {/* Hour grid */}
            <div>
              <p className="text-xs font-medium text-[#98A2B2] mb-1.5">{t('hour_label')}</p>
              <div className="grid grid-cols-6 gap-1">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onChange(to24h(period, h, nearestMinute))}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      hour === h
                        ? 'bg-[#0669F7] text-white shadow-sm'
                        : 'text-[#25282A] hover:bg-[#F2F4F5]'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minute grid */}
            <div>
              <p className="text-xs font-medium text-[#98A2B2] mb-1.5">{t('minute_label')}</p>
              <div className="grid grid-cols-6 gap-1">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChange(to24h(period, hour, m))}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      nearestMinute === m
                        ? 'bg-[#0669F7] text-white shadow-sm'
                        : 'text-[#25282A] hover:bg-[#F2F4F5]'
                    }`}
                  >
                    :{m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clear button */}
          {value && (
            <div className="border-t border-[#EFF1F5] px-4 py-2 flex justify-end">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="text-xs text-[#98A2B2] hover:text-[#ED1C24] transition-colors"
              >
                {t('clear')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
