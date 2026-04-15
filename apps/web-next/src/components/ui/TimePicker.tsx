'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
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

// Scrollable column with auto-scroll to selected item
function Column({
  items,
  selected,
  onSelect,
  renderLabel,
}: {
  items: string[]
  selected: string
  onSelect: (v: string) => void
  renderLabel?: (v: string) => string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const idx = items.indexOf(selected)
    if (idx >= 0) {
      el.scrollTop = idx * 44 - el.clientHeight / 2 + 22
    }
  }, [selected, items])

  return (
    <div
      ref={containerRef}
      className="flex flex-col overflow-y-auto scrollbar-hide"
      style={{ height: 220, scrollSnapType: 'y mandatory' }}
    >
      <div style={{ height: 88, flexShrink: 0 }} />
      {items.map((item) => {
        const isSelected = item === selected
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            style={{ height: 44, flexShrink: 0, scrollSnapAlign: 'center' }}
            className={`flex items-center justify-center text-base font-medium transition-all rounded-xl mx-1 ${
              isSelected
                ? 'bg-[#0669F7] text-white font-bold'
                : 'text-[#25282A] hover:bg-[#F2F4F5]'
            }`}
          >
            {renderLabel ? renderLabel(item) : item}
          </button>
        )
      })}
      <div style={{ height: 88, flexShrink: 0 }} />
    </div>
  )
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
  const [fixedWidth, setFixedWidth] = React.useState(240)

  const { period, hour, minute } = parse(value)

  // Close on scroll or resize
  React.useEffect(() => {
    if (!open) return
    function handleClose() { setOpen(false) }
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose)
    return () => {
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [open])

  function setPeriod(p: 'AM' | 'PM') { onChange(to24h(p, hour, minute)) }
  function setHour(h: string)         { onChange(to24h(period, h, minute)) }
  function setMinute(m: string)       { onChange(to24h(period, hour, m)) }

  const nearestMinute = MINUTES.includes(minute)
    ? minute
    : MINUTES.reduce((best, m) =>
        Math.abs(parseInt(m) - parseInt(minute)) < Math.abs(parseInt(best) - parseInt(minute)) ? m : best
      , MINUTES[0])

  const amLabel = t('am')
  const pmLabel = t('pm')
  const displayValue = value ? `${period === 'AM' ? amLabel : pmLabel} ${hour}:${minute}` : ''

  const inputBase = `w-full px-3 py-2.5 rounded-2xl border text-sm bg-white flex items-center justify-between cursor-pointer transition-colors ${
    disabled
      ? 'border-[#EFF1F5] bg-[#F2F4F5] cursor-not-allowed text-[#98A2B2]'
      : 'border-[#EFF1F5] text-[#25282A] hover:border-[#0669F7]'
  } ${open ? 'border-[#0669F7] ring-2 ring-[#0669F7]/10' : ''} ${className}`

  function openPicker() {
    if (disabled) return
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const pickerH = 290
      const pickerW = Math.max(rect.width, 240)
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const top = spaceBelow >= pickerH
        ? rect.bottom + 4
        : Math.max(8, rect.top - pickerH - 4)
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - pickerW - 8))
      setFixedTop(top)
      setFixedLeft(left)
      setFixedWidth(pickerW)
    }
    setOpen(true)
  }

  const picker = (
    <>
      {/* Invisible full-screen backdrop — captures all outside clicks */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Picker panel — above backdrop */}
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl shadow-2xl border border-[#EFF1F5] overflow-hidden"
        style={{ position: 'fixed', top: fixedTop, left: fixedLeft, zIndex: 9999, width: fixedWidth }}
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

        {/* 3 columns */}
        <div className="flex relative" style={{ height: 220 }}>
          {/* Center highlight bar */}
          <div
            className="pointer-events-none absolute left-0 right-0 bg-[#F2F4F5] rounded-xl mx-2"
            style={{ top: '50%', transform: 'translateY(-50%)', height: 44 }}
          />

          {/* AM / PM */}
          <div className="flex-1 border-r border-[#EFF1F5]">
            <Column
              items={['AM', 'PM']}
              selected={period}
              onSelect={(v) => setPeriod(v as 'AM' | 'PM')}
              renderLabel={(v) => v === 'AM' ? amLabel : pmLabel}
            />
          </div>

          {/* Hours */}
          <div className="flex-1 border-r border-[#EFF1F5]">
            <Column items={HOURS} selected={hour} onSelect={setHour} />
          </div>

          {/* Minutes */}
          <div className="flex-1">
            <Column items={MINUTES} selected={nearestMinute} onSelect={setMinute} />
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
    </>
  )

  return (
    <div ref={containerRef} className="relative w-full">
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

      {open && typeof document !== 'undefined' && createPortal(picker, document.body)}
    </div>
  )
}
