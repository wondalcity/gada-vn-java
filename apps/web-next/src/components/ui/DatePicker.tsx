'use client'

import * as React from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(value: string): Date | null {
  if (!value) return null
  const d = new Date(value + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DatePickerProps {
  value: string            // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void
  min?: string             // 'YYYY-MM-DD'
  max?: string             // 'YYYY-MM-DD'
  placeholder?: string
  className?: string
  disabled?: boolean
  label?: string
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = '날짜 선택',
  className = '',
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [view, setView] = React.useState<'calendar' | 'month' | 'year'>('calendar')
  const containerRef = React.useRef<HTMLDivElement>(null)

  const today = new Date()
  const selected = parseDate(value)
  const minDate = parseDate(min ?? '')
  const maxDate = parseDate(max ?? '')

  // Viewing year/month (defaults to selected or today)
  const [viewYear, setViewYear] = React.useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = React.useState(selected?.getMonth() ?? today.getMonth())

  // Year scroll range
  const currentYear = today.getFullYear()
  const yearMin = minDate ? minDate.getFullYear() : currentYear - 100
  const yearMax = maxDate ? maxDate.getFullYear() : currentYear + 10

  // Sync view when value changes externally
  React.useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear())
      setViewMonth(selected.getMonth())
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function openPicker() {
    if (disabled) return
    const base = selected ?? today
    setViewYear(base.getFullYear())
    setViewMonth(base.getMonth())
    setView('calendar')
    setOpen(true)
  }

  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day)
    onChange(toIsoDate(d))
    setOpen(false)
  }

  function isDayDisabled(day: number): boolean {
    const d = new Date(viewYear, viewMonth, day)
    if (minDate && d < minDate) return true
    if (maxDate && d > maxDate) return true
    return false
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // Display value
  const displayValue = selected
    ? `${selected.getFullYear()}년 ${selected.getMonth() + 1}월 ${selected.getDate()}일`
    : ''

  // Build calendar grid
  const totalDays = daysInMonth(viewYear, viewMonth)
  const startDay = firstDayOfWeek(viewYear, viewMonth)
  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null)

  const inputBase = `w-full px-3 py-2.5 rounded-lg border text-sm bg-white flex items-center justify-between cursor-pointer transition-colors ${
    disabled ? 'border-[#EFF1F5] bg-[#F2F4F5] cursor-not-allowed text-[#98A2B2]' : 'border-[#EFF1F5] text-[#25282A] hover:border-[#0669F7]'
  } ${open ? 'border-[#0669F7] ring-2 ring-[#0669F7]/10' : ''} ${className}`

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className={inputBase}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={displayValue ? 'text-[#25282A]' : 'text-[#98A2B2]'}>
          {displayValue || placeholder}
        </span>
        <svg className={`w-4 h-4 shrink-0 transition-colors ${open ? 'text-[#0669F7]' : 'text-[#98A2B2]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="dialog"
          className="absolute z-50 mt-1.5 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-[#EFF1F5] overflow-hidden"
          style={{ left: 0, top: '100%' }}
        >
          {/* ── Calendar view ── */}
          {view === 'calendar' && (
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={prevMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8F8FA] text-[#98A2B2] hover:text-[#25282A] transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button type="button"
                  onClick={() => setView('month')}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-[#F8F8FA] transition-colors">
                  <span className="text-sm font-semibold text-[#25282A]">{viewYear}년 {MONTHS_KO[viewMonth]}</span>
                  <svg className="w-3.5 h-3.5 text-[#98A2B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button type="button" onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8F8FA] text-[#98A2B2] hover:text-[#25282A] transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Week days */}
              <div className="grid grid-cols-7 mb-1">
                {WEEK_DAYS.map((d, i) => (
                  <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-[#ED1C24]' : i === 6 ? 'text-[#0669F7]' : 'text-[#98A2B2]'}`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} />
                  const isSelected = selected?.getFullYear() === viewYear && selected?.getMonth() === viewMonth && selected?.getDate() === day
                  const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day
                  const disabled = isDayDisabled(day)
                  const col = idx % 7
                  const isSunday = col === 0
                  const isSaturday = col === 6
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectDay(day)}
                      className={`
                        w-full aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all
                        ${isSelected ? 'bg-[#0669F7] text-white shadow-sm' : ''}
                        ${!isSelected && isToday ? 'border border-[#0669F7] text-[#0669F7]' : ''}
                        ${!isSelected && !isToday && !disabled ? (
                          isSunday ? 'text-[#ED1C24] hover:bg-[#FDE8EE]' :
                          isSaturday ? 'text-[#0669F7] hover:bg-[#E6F0FE]' :
                          'text-[#25282A] hover:bg-[#F8F8FA]'
                        ) : ''}
                        ${disabled ? 'text-[#DDDDDD] cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {/* Today button */}
              <div className="mt-3 pt-3 border-t border-[#EFF1F5]">
                <button
                  type="button"
                  onClick={() => {
                    if (!isDayDisabled(today.getDate()) || (viewYear !== today.getFullYear() || viewMonth !== today.getMonth())) {
                      setViewYear(today.getFullYear())
                      setViewMonth(today.getMonth())
                      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                      const isDisabled = (minDate && d < minDate) || (maxDate && d > maxDate)
                      if (!isDisabled) {
                        onChange(toIsoDate(today))
                        setOpen(false)
                      } else {
                        setViewYear(today.getFullYear())
                        setViewMonth(today.getMonth())
                      }
                    }
                  }}
                  className="w-full py-2 rounded-lg text-xs font-medium text-[#0669F7] hover:bg-[#E6F0FE] transition-colors"
                >
                  오늘
                </button>
              </div>
            </div>
          )}

          {/* ── Month view ── */}
          {view === 'month' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={() => setViewYear(y => y - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8F8FA] text-[#98A2B2]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button type="button" onClick={() => setView('year')}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-[#F8F8FA]">
                  <span className="text-sm font-semibold text-[#25282A]">{viewYear}년</span>
                  <svg className="w-3.5 h-3.5 text-[#98A2B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button type="button" onClick={() => setViewYear(y => y + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8F8FA] text-[#98A2B2]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS_KO.map((name, idx) => {
                  const isSelected = selected && selected.getFullYear() === viewYear && selected.getMonth() === idx
                  const isCurrent = today.getFullYear() === viewYear && today.getMonth() === idx
                  return (
                    <button key={idx} type="button"
                      onClick={() => { setViewMonth(idx); setView('calendar') }}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isSelected ? 'bg-[#0669F7] text-white' :
                        isCurrent ? 'border border-[#0669F7] text-[#0669F7]' :
                        'text-[#25282A] hover:bg-[#F8F8FA]'
                      }`}>
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Year view ── */}
          {view === 'year' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-[#25282A]">연도 선택</span>
                <button type="button" onClick={() => setView('month')}
                  className="text-xs text-[#0669F7] font-medium hover:underline">닫기</button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto">
                {Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMax - i).map(year => {
                  const isSelected = selected?.getFullYear() === year
                  const isCurrent = today.getFullYear() === year
                  return (
                    <button key={year} type="button"
                      onClick={() => { setViewYear(year); setView('month') }}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected ? 'bg-[#0669F7] text-white' :
                        isCurrent ? 'border border-[#0669F7] text-[#0669F7]' :
                        'text-[#25282A] hover:bg-[#F8F8FA]'
                      }`}>
                      {year}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
