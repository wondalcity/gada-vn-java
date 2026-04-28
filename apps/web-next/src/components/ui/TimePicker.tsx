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

const ITEM_H = 44
const VISIBLE = 5   // number of items visible in each column

const PERIODS = ['AM', 'PM'] as const
const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
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

// ── Drum Column ───────────────────────────────────────────────────────────────

interface ColumnProps {
  items: readonly string[]
  selected: string
  onSelect: (v: string) => void
  renderLabel?: (v: string) => string
  width?: number
}

function Column({ items, selected, onSelect, renderLabel, width }: ColumnProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const isProgRef   = React.useRef(false)   // true while we're scrolling programmatically
  const timerRef    = React.useRef<ReturnType<typeof setTimeout>>()

  const scrollTo = React.useCallback((item: string, instant = false) => {
    const el = containerRef.current
    if (!el) return
    const idx = items.indexOf(item)
    if (idx < 0) return
    isProgRef.current = true
    el.scrollTop = idx * ITEM_H
    if (!instant) {
      // smooth re-center after a brief paint
      requestAnimationFrame(() => {
        if (el) el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
      })
    }
    setTimeout(() => { isProgRef.current = false }, 400)
  }, [items])

  // Scroll to selected on open (instant so the panel starts correctly positioned)
  // initialized stays true after first mount — do NOT reset it, otherwise the first
  // re-render (e.g. after the user selects a value) would trigger scrollTo again,
  // firing a scroll event that the window listener catches and closes the picker.
  const initialized = React.useRef(false)
  React.useLayoutEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      scrollTo(selected, true)
    }
  })

  // When selected changes externally (parent state), smooth-scroll
  const prevSelected = React.useRef(selected)
  React.useEffect(() => {
    if (prevSelected.current !== selected) {
      prevSelected.current = selected
      scrollTo(selected)
    }
  }, [selected, scrollTo])

  // Detect scroll-stop → pick centered item
  const handleScroll = React.useCallback(() => {
    if (isProgRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const el = containerRef.current
      if (!el) return
      const raw = el.scrollTop / ITEM_H
      const idx = Math.round(raw)
      const clamped = Math.max(0, Math.min(items.length - 1, idx))
      const newItem = items[clamped]
      // Snap to clean position
      isProgRef.current = true
      el.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' })
      setTimeout(() => { isProgRef.current = false }, 400)
      if (newItem !== selected) onSelect(newItem)
    }, 120)
  }, [items, selected, onSelect])

  const colH = ITEM_H * VISIBLE

  return (
    <div className="relative overflow-hidden flex-1" style={{ height: colH, width }}>
      {/* Top fade — dims items above selection */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{
          height: ITEM_H * 2,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.3) 100%)',
        }}
      />
      {/* Center highlight band */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 border-y border-outline"
        style={{ top: ITEM_H * 2, height: ITEM_H, background: 'rgba(239,241,245,0.7)' }}
      />
      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{
          height: ITEM_H * 2,
          background: 'linear-gradient(to top, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.3) 100%)',
        }}
      />

      {/* Scrollable list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-scroll scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {/* Top spacer: 2 invisible items so first item can center */}
        <div style={{ height: ITEM_H * 2 }} aria-hidden="true" />

        {items.map((item) => {
          const isSel = item === selected
          return (
            <div
              key={item}
              onClick={() => { onSelect(item); scrollTo(item) }}
              style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
              className={`relative z-20 flex items-center justify-center cursor-pointer select-none transition-all duration-150 ${
                isSel
                  ? 'text-primary font-bold text-lg'
                  : 'text-on-surface-variant font-normal text-base'
              }`}
            >
              {renderLabel ? renderLabel(item) : item}
            </div>
          )
        })}

        {/* Bottom spacer */}
        <div style={{ height: ITEM_H * 2 }} aria-hidden="true" />
      </div>
    </div>
  )
}

// ── TimePicker ────────────────────────────────────────────────────────────────

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
  const [fixedTop, setFixedTop]   = React.useState(0)
  const [fixedLeft, setFixedLeft] = React.useState(0)

  const { period, hour, minute } = parse(value)

  const nearestMinute = MINUTES.includes(minute)
    ? minute
    : MINUTES.reduce((best, m) =>
        Math.abs(parseInt(m) - parseInt(minute)) < Math.abs(parseInt(best) - parseInt(minute)) ? m : best
      , MINUTES[0])

  // Close on outside click / scroll / resize — same pattern as DatePicker
  React.useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const picker = document.getElementById('timepicker-portal')
        if (picker && picker.contains(e.target as Node)) return
        setOpen(false)
      }
    }
    function handleClose(e: Event) {
      // Ignore scroll events that originate from inside the picker itself
      // (the drum columns scroll programmatically when a value is selected)
      const picker = document.getElementById('timepicker-portal')
      if (picker && e.target instanceof Node && picker.contains(e.target)) return
      setOpen(false)
    }
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
      const pickerH = 310
      const pickerW = 252
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const top  = spaceBelow >= pickerH ? rect.bottom + 6 : Math.max(8, rect.top - pickerH - 6)
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - pickerW - 16))
      setFixedTop(top)
      setFixedLeft(left)
    }
    setOpen(true)
  }

  const amLabel = t('am')
  const pmLabel = t('pm')
  const displayValue = value
    ? `${period === 'AM' ? amLabel : pmLabel} ${hour}:${nearestMinute}`
    : ''

  const inputBase = [
    'w-full px-3 py-2.5 rounded-sm border text-sm bg-surface flex items-center justify-between transition-colors',
    disabled
      ? 'border-outline bg-surface-container cursor-not-allowed text-on-surface-variant'
      : 'border-outline text-on-surface hover:border-primary cursor-pointer',
    open ? 'border-primary ring-2 ring-primary/10' : '',
    className,
  ].join(' ')

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
        <span className={value ? 'text-on-surface' : 'text-on-surface-variant'}>
          {value ? displayValue : (placeholder ?? t('title'))}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 transition-colors ${open ? 'text-primary' : 'text-on-surface-variant'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Dropdown — inline fixed, same as DatePicker (no createPortal) */}
      {open && (
        <div
          id="timepicker-portal"
          role="dialog"
          aria-modal="true"
          className="bg-surface rounded-3xl shadow-2xl border border-outline overflow-hidden"
          style={{ position: 'fixed', top: fixedTop, left: fixedLeft, zIndex: 9999, width: 252 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline">
            <span className="text-sm font-semibold text-on-surface">{t('title')}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-primary hover:opacity-70 transition-opacity"
            >
              {t('confirm')}
            </button>
          </div>

          {/* Column headers */}
          <div className="flex border-b border-outline divide-x divide-outline">
            {[t('am') + '/' + t('pm'), t('hour_label'), t('minute_label')].map((label) => (
              <div key={label} className="flex-1 text-center text-[10px] font-medium text-on-surface-variant py-1">
                {label}
              </div>
            ))}
          </div>

          {/* 3 drum columns */}
          <div className="flex divide-x divide-outline">
            <Column
              items={PERIODS}
              selected={period}
              onSelect={(p) => onChange(to24h(p as 'AM' | 'PM', hour, nearestMinute))}
              renderLabel={(v) => v === 'AM' ? amLabel : pmLabel}
            />
            <Column
              items={HOURS}
              selected={hour}
              onSelect={(h) => onChange(to24h(period, h, nearestMinute))}
            />
            <Column
              items={MINUTES}
              selected={nearestMinute}
              onSelect={(m) => onChange(to24h(period, hour, m))}
              renderLabel={(m) => `:${m}`}
            />
          </div>

          {/* Footer */}
          {value && (
            <div className="border-t border-outline px-4 py-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="text-xs text-on-surface-variant hover:text-error transition-colors"
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
