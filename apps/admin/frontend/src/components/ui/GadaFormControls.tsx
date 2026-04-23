/**
 * GADA Design System — Form Controls
 *
 * Wraps native select / date / time inputs with GADA-consistent styling:
 *   - rounded-2xl, #0669F7 focus ring, #EFF1F5 border
 *   - Custom chevron / calendar / clock icons (hides browser defaults)
 */

import * as React from 'react'

// ── Shared base class ─────────────────────────────────────────────────────────
const BASE =
  'w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm text-[#25282A] bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-[#0669F7] disabled:opacity-60 disabled:cursor-not-allowed'

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
        <svg className="w-4 h-4 text-[#98A2B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}

// ── GadaDateInput ─────────────────────────────────────────────────────────────

const DATE_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function formatDisplayDate(value: string): string {
  if (!value) return ''
  const parts = value.split('-')
  if (parts.length !== 3) return ''
  const [year, month, day] = parts
  const mIdx = parseInt(month, 10) - 1
  if (mIdx < 0 || mIdx > 11 || !year || !day) return ''
  return `${day}/${DATE_MONTHS[mIdx]}/${year}`
}

interface GadaDateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  locale?: string
}

export function GadaDateInput({ className = '', locale = 'ko', value, ...props }: GadaDateInputProps) {
  const showCustomDisplay = locale !== 'ko'
  const displayValue = showCustomDisplay && typeof value === 'string' && value
    ? formatDisplayDate(value)
    : ''

  return (
    <div className="relative">
      <input
        type="date"
        className={
          `${BASE} pr-9 ` +
          // Stretch the native calendar-picker-indicator over the entire input
          // so clicking anywhere opens the picker; then hide it visually.
          '[&::-webkit-calendar-picker-indicator]:absolute ' +
          '[&::-webkit-calendar-picker-indicator]:inset-0 ' +
          '[&::-webkit-calendar-picker-indicator]:w-full ' +
          '[&::-webkit-calendar-picker-indicator]:h-full ' +
          '[&::-webkit-calendar-picker-indicator]:opacity-0 ' +
          '[&::-webkit-calendar-picker-indicator]:cursor-pointer ' +
          className
        }
        style={showCustomDisplay ? { color: 'transparent' } : undefined}
        value={value}
        {...props}
      />
      {showCustomDisplay && (
        <div className="pointer-events-none absolute inset-0 flex items-center px-3 pr-9">
          <span className={`text-sm ${displayValue ? 'text-[#25282A]' : 'text-[#98A2B2]'}`}>
            {displayValue || 'DD/MMM/YYYY'}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg className="w-4 h-4 text-[#98A2B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
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
        <svg className="w-4 h-4 text-[#98A2B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  )
}
