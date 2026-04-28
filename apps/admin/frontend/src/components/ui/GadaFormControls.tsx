/**
 * GADA Design System — Form Controls
 *
 * Wraps native select / date / time inputs with GADA-consistent styling:
 *   - rounded-sm (4px) for triggers/inputs, rounded-3xl (24px) for floating panels
 *   - primary focus ring, outline border
 *   - Custom chevron / calendar / clock icons (hides browser defaults)
 */

import * as React from 'react'

// ── Shared base class ─────────────────────────────────────────────────────────
const BASE =
  'w-full border border-outline rounded-sm px-3 py-2.5 text-sm text-on-surface bg-surface ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

// ── GadaSelect ────────────────────────────────────────────────────────────────
interface GadaSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function GadaSelect({ className = '', children, ...props }: GadaSelectProps) {
  return (
    <div className="relative">
      <select
        className={`${BASE} appearance-none pr-9 ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}

// ── GadaDateInput — custom locale-aware calendar ───────────────────────────────

const LOCALE_MAP: Record<string, string> = { ko: 'ko-KR', vi: 'vi-VN', en: 'en-US' }

function toIntlLocale(locale: string) {
  return LOCALE_MAP[locale] ?? locale
}

function formatDisplayDate(value: string, locale: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return ''
  const date = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat(toIntlLocale(locale), { year: 'numeric', month: 'short', day: '2-digit' }).format(date)
}

function getDayHeaders(locale: string): string[] {
  const intlLocale = toIntlLocale(locale)
  // Build 7 day headers starting Sunday (day 0)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2023, 0, 1 + i) // Jan 1 2023 = Sunday
    return new Intl.DateTimeFormat(intlLocale, { weekday: 'short' }).format(date)
  })
}

function getMonthLabel(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), { year: 'numeric', month: 'long' }).format(new Date(year, month, 1))
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

interface CalendarProps {
  value: string       // YYYY-MM-DD or ''
  locale: string
  onSelect: (iso: string) => void
  onClear: () => void
  onClose: () => void
  clearLabel: string
  todayLabel: string
}

function GadaCalendar({ value, locale, onSelect, onClear, onClose, clearLabel, todayLabel }: CalendarProps) {
  const today = new Date()
  const parsed = value ? value.split('-').map(Number) : null
  const [viewYear, setViewYear] = React.useState(parsed ? parsed[0] : today.getFullYear())
  const [viewMonth, setViewMonth] = React.useState(parsed ? parsed[1] - 1 : today.getMonth())

  const firstDow = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
  const totalDays = daysInMonth(viewYear, viewMonth)
  const dayHeaders = getDayHeaders(locale)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }
  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onSelect(iso)
    onClose()
  }
  function goToday() {
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    onSelect(iso)
    onClose()
  }

  const selectedDay = parsed && parsed[0] === viewYear && parsed[1] - 1 === viewMonth ? parsed[2] : null
  const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth ? today.getDate() : null

  // Build grid: leading empty cells + day numbers
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  // Pad to full rows of 7
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div
      className="absolute z-50 mt-1 bg-surface border border-outline rounded-3xl shadow-lg p-3 w-64"
      onMouseDown={(e) => e.preventDefault()} // prevent input blur
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth}
          className="p-1 rounded-lg hover:bg-surface-container text-on-surface">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-on-surface">
          {getMonthLabel(viewYear, viewMonth, locale)}
        </span>
        <button type="button" onClick={nextMonth}
          className="p-1 rounded-lg hover:bg-surface-container text-on-surface">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-on-surface-variant py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />
          const isSelected = day === selectedDay
          const isToday = day === todayDay
          return (
            <button
              key={idx}
              type="button"
              onClick={() => selectDay(day)}
              className={`
                text-xs py-1.5 rounded-lg text-center transition-colors
                ${isSelected
                  ? 'bg-primary text-white font-semibold'
                  : isToday
                  ? 'bg-primary-8 text-primary font-semibold'
                  : 'text-on-surface hover:bg-surface-container'}
              `}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between mt-2 pt-2 border-t border-outline">
        <button type="button" onClick={() => { onClear(); onClose() }}
          className="text-xs text-primary hover:underline px-1">{clearLabel}</button>
        <button type="button" onClick={goToday}
          className="text-xs text-primary hover:underline px-1">{todayLabel}</button>
      </div>
    </div>
  )
}

const CLEAR_LABEL: Record<string, string> = { ko: '삭제', vi: 'Xóa', en: 'Clear' }
const TODAY_LABEL: Record<string, string> = { ko: '오늘', vi: 'Hôm nay', en: 'Today' }

interface GadaDateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  locale?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function GadaDateInput({ className = '', locale = 'ko', value = '', onChange, required, ...props }: GadaDateInputProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function handleSelect(iso: string) {
    // Synthesize a change event with the ISO value
    const nativeInput = containerRef.current?.querySelector('input[type="hidden"]') as HTMLInputElement | null
    if (nativeInput) {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(nativeInput, iso)
      nativeInput.dispatchEvent(new Event('change', { bubbles: true }))
    }
    onChange?.({ target: { value: iso } } as React.ChangeEvent<HTMLInputElement>)
  }

  function handleClear() {
    onChange?.({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
  }

  const displayText = value ? formatDisplayDate(value, locale) : ''

  return (
    <div className="relative" ref={containerRef}>
      {/* Hidden native input for form required validation */}
      <input type="hidden" value={value} {...props} />
      {required && (
        <input
          type="text"
          required
          value={value}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Visible display button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${BASE} pr-9 text-left ${!displayText ? 'text-on-surface-variant' : ''} ${open ? 'border-primary ring-2 ring-primary/20' : ''} ${className}`}
      >
        {displayText || (locale === 'ko' ? 'YYYY-MM-DD' : 'DD/MMM/YYYY')}
      </button>

      {/* Calendar icon */}
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg className={`w-4 h-4 ${open ? 'text-primary' : 'text-on-surface-variant'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {open && (
        <GadaCalendar
          value={value}
          locale={locale}
          onSelect={handleSelect}
          onClear={handleClear}
          onClose={() => setOpen(false)}
          clearLabel={CLEAR_LABEL[locale] ?? 'Clear'}
          todayLabel={TODAY_LABEL[locale] ?? 'Today'}
        />
      )}
    </div>
  )
}

// ── GadaTimeInput ─────────────────────────────────────────────────────────────
interface GadaTimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export function GadaTimeInput({ className = '', ...props }: GadaTimeInputProps) {
  return (
    <div className="relative">
      <input
        type="time"
        className={
          `${BASE} pr-9 ` +
          '[&::-webkit-calendar-picker-indicator]:absolute ' +
          '[&::-webkit-calendar-picker-indicator]:inset-0 ' +
          '[&::-webkit-calendar-picker-indicator]:w-full ' +
          '[&::-webkit-calendar-picker-indicator]:h-full ' +
          '[&::-webkit-calendar-picker-indicator]:opacity-0 ' +
          '[&::-webkit-calendar-picker-indicator]:cursor-pointer ' +
          className
        }
        {...props}
      />
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  )
}
