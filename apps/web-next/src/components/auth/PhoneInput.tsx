'use client'

/**
 * PhoneInput — country code picker + phone number input.
 *
 * The dropdown is rendered via React Portal into document.body and uses
 * fixed positioning so it is never clipped by overflow:auto/hidden parents.
 *
 * value / onChange use E.164 format: "+84901234567"
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@gada/ui'

// ─── Country data ─────────────────────────────────────────────────────────────

interface Country {
  code: string
  dial: string
  flag: string
  name: string
  placeholder: string
}

const COUNTRIES: Country[] = [
  { code: 'VN', dial: '+84', flag: '🇻🇳', name: '베트남',   placeholder: '901 234 567'  },
  { code: 'KR', dial: '+82', flag: '🇰🇷', name: '대한민국', placeholder: '10 1234 5678' },
  { code: 'AU', dial: '+61', flag: '🇦🇺', name: '호주',     placeholder: '412 345 678'  },
  { code: 'US', dial: '+1',  flag: '🇺🇸', name: '미국',     placeholder: '201 234 5678' },
]

// ─── Validation ───────────────────────────────────────────────────────────────

const PHONE_RULES: Record<string, { min: number; max: number; errorKey: string }> = {
  '+84': { min: 9,  max: 9,  errorKey: 'otp.phone_invalid_vn' },
  '+82': { min: 9,  max: 10, errorKey: 'otp.phone_invalid_kr' },
  '+61': { min: 9,  max: 9,  errorKey: 'otp.phone_invalid_au' },
  '+1':  { min: 10, max: 10, errorKey: 'otp.phone_invalid_us' },
}

export function validatePhone(e164: string): string | null {
  for (const [dial, rule] of Object.entries(PHONE_RULES)) {
    if (e164.startsWith(dial)) {
      const local = e164.slice(dial.length).replace(/\s/g, '')
      if (local.length < rule.min || local.length > rule.max) return rule.errorKey
      return null
    }
  }
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseE164(e164: string): { country: Country; local: string } {
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of sorted) {
    if (e164.startsWith(c.dial)) {
      return { country: c, local: e164.slice(c.dial.length) }
    }
  }
  return { country: COUNTRIES[0], local: e164.replace(/^\+\d+/, '') }
}

// ─── Portal dropdown ──────────────────────────────────────────────────────────

interface DropdownPortalProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  selected: Country
  onSelect: (c: Country) => void
  onClose: () => void
}

function CountryDropdownPortal({ anchorRef, selected, onSelect, onClose }: DropdownPortalProps) {
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 220 })
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  React.useEffect(() => {
    if (!mounted) return
    function place() {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 220) })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [mounted, anchorRef])

  React.useEffect(() => {
    function onDown(e: MouseEvent) {
      const panel = document.getElementById('phone-country-dropdown')
      if (panel?.contains(e.target as Node)) return
      if (anchorRef.current?.contains(e.target as Node)) return
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [anchorRef, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      id="phone-country-dropdown"
      role="listbox"
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: Math.min(pos.width, window.innerWidth - 24), zIndex: 9999 }}
      className="rounded-2xl border border-[#EFF1F5] bg-white shadow-2xl overflow-hidden"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <ul className="py-1">
        {COUNTRIES.map((c) => {
          const isSel = c.code === selected.code
          return (
            <li key={c.code} role="option" aria-selected={isSel}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(c); onClose() }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-[#EEF3FF]',
                  isSel ? 'bg-[#EEF3FF]' : 'hover:bg-[#F5F7FF]',
                )}
              >
                <span className="text-[22px] leading-none">{c.flag}</span>
                <span className="flex-1 text-[14px] font-medium text-[#25282A]">{c.name}</span>
                <span className="text-[13px] text-[#98A2B2] tabular-nums">{c.dial}</span>
                {isSel && (
                  <svg className="w-4 h-4 shrink-0 text-[#0669F7]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="m20 6-11 11-5-5" />
                  </svg>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>,
    document.body,
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PhoneInputProps {
  value: string
  onChange: (e164: string) => void
  error?: string
  label?: string
  disabled?: boolean
}

export function PhoneInput({ value, onChange, error, label, disabled }: PhoneInputProps) {
  const inputId = React.useId()
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)

  const { country, local } = parseE164(value || '+84')
  const [rawLocal, setRawLocal] = React.useState(local)

  // Sync display when parent resets value
  React.useEffect(() => {
    const normalized = rawLocal.replace(/^0+/, '')
    if (country.dial + normalized !== value && country.dial + rawLocal !== value) {
      setRawLocal(local)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleCountrySelect(c: Country) {
    const normalized = rawLocal.replace(/^0+/, '')
    onChange(c.dial + normalized)
  }

  function handleLocalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^\d\s]/g, '').replace(/\s/g, '')
    setRawLocal(digits)
    const normalized = digits.replace(/^0+/, '')
    onChange(country.dial + normalized)
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-[14px] font-medium leading-[18px] text-[#25282A]">
          {label}
        </label>
      )}

      <div
        ref={wrapRef}
        className={cn(
          'flex items-center h-14 bg-white rounded-2xl border',
          'transition-colors duration-150',
          error
            ? 'border-[#ED1C24] ring-1 ring-[#ED1C24]'
            : open
            ? 'border-[#0669F7] ring-1 ring-[#0669F7]'
            : 'border-[#EFF1F5] focus-within:border-[#0669F7] focus-within:ring-1 focus-within:ring-[#0669F7]',
          disabled && 'bg-[#EFF1F5] cursor-not-allowed',
        )}
      >
        {/* ── Country picker trigger ── */}
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="국가 코드 선택"
          className={cn(
            'flex items-center gap-1.5 shrink-0 h-full pl-3.5 pr-2.5',
            'border-r border-[#EFF1F5] rounded-l-2xl',
            'transition-colors hover:bg-[#F5F7FF] active:bg-[#EEF3FF]',
            'disabled:cursor-not-allowed disabled:hover:bg-transparent',
          )}
        >
          <span className="text-[22px] leading-none select-none">{country.flag}</span>
          <span className="text-[14px] font-semibold text-[#25282A] tabular-nums">{country.dial}</span>
          <svg
            className={cn('w-3.5 h-3.5 text-[#98A2B2] transition-transform duration-150', open && 'rotate-180')}
            fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {/* ── Portal dropdown ── */}
        {open && (
          <CountryDropdownPortal
            anchorRef={triggerRef}
            selected={country}
            onSelect={handleCountrySelect}
            onClose={() => setOpen(false)}
          />
        )}

        {/* ── Phone number input ── */}
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          value={rawLocal}
          onChange={handleLocalChange}
          disabled={disabled}
          placeholder={country.placeholder}
          autoComplete="tel-national"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'flex-1 px-3 bg-transparent outline-none min-w-0',
            'text-[16px] leading-[24px] text-[#25282A]',
            'placeholder:text-[#98A2B2]',
            'disabled:cursor-not-allowed disabled:text-[#B2B2B2]',
          )}
        />
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-[13px] leading-[18px] text-[#ED1C24]">
          {error}
        </p>
      )}
    </div>
  )
}
