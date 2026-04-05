/**
 * PhoneInput — country code selector + phone number input.
 *
 * Defaults to Vietnam (+84) since that's the primary market.
 * Shows country flag emoji + dial code prefix.
 * Formats the full phone as E.164 (+84901234567) for API calls.
 *
 * Usage:
 *   <PhoneInput value={phone} onChange={setPhone} />
 *   // value / onChange use E.164 format: "+84901234567"
 */

'use client'

import * as React from 'react'
import { cn } from '@gada/ui'

const COUNTRY_CODES = [
  { code: 'VN', dial: '+84', flag: '🇻🇳', name: '베트남' },
  { code: 'KR', dial: '+82', flag: '🇰🇷', name: '한국' },
  { code: 'US', dial: '+1',  flag: '🇺🇸', name: 'US' },
] as const

/** Per-country digit count rules for the local part (after dial code, no leading zero). */
const PHONE_RULES: Record<string, { min: number; max: number; errorKey: string }> = {
  '+84': { min: 9, max: 9,  errorKey: 'otp.phone_invalid_vn' },
  '+82': { min: 9, max: 10, errorKey: 'otp.phone_invalid_kr' },
  '+1':  { min: 10, max: 10, errorKey: 'otp.phone_invalid_us' },
}

/**
 * Validates an E.164 phone number against per-country digit count rules.
 * Returns a translation key (from the `auth` namespace) if invalid, or null if valid.
 */
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

interface PhoneInputProps {
  value: string       // E.164 format: "+84901234567"
  onChange: (e164: string) => void
  error?: string
  label?: string
  disabled?: boolean
  placeholder?: string
}

export function PhoneInput({
  value,
  onChange,
  error,
  label,
  disabled,
  placeholder = '901 234 567',
}: PhoneInputProps) {
  const inputId = React.useId()

  // Parse E.164 into dial code + local number (without leading zero)
  const parseE164 = (e164: string) => {
    for (const c of COUNTRY_CODES) {
      if (e164.startsWith(c.dial)) {
        return { dialCode: c.dial, local: e164.slice(c.dial.length) }
      }
    }
    return { dialCode: '+84', local: e164.replace(/^\+\d+/, '') }
  }

  const { dialCode, local } = parseE164(value || '+84')

  // Internal display state: user may type with leading 0 (e.g. "01912341234")
  // but onChange emits E.164 without leading 0 ("+821912341234")
  const [rawLocal, setRawLocal] = React.useState(local)

  // Sync display if external value changes (e.g. cleared by parent)
  React.useEffect(() => {
    // Only reset display if the external value clearly doesn't match what we have
    const normalized = rawLocal.replace(/^0+/, '')
    if (dialCode + normalized !== value && dialCode + rawLocal !== value) {
      setRawLocal(local)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleDialChange = (newDial: string) => {
    // Keep display as-is, re-emit with new dial code (stripping leading 0)
    const normalized = rawLocal.replace(/^0+/, '')
    onChange(newDial + normalized)
  }

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits and spaces
    const cleaned = e.target.value.replace(/[^\d\s]/g, '')
    const digits = cleaned.replace(/\s/g, '')
    setRawLocal(digits) // Display keeps leading 0
    // Emit E.164: strip leading zero(s) so "+82" + "01912341234" → "+821912341234"
    const normalized = digits.replace(/^0+/, '')
    onChange(dialCode + normalized)
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-[14px] font-medium leading-[18px] text-[#25282A]">
          {label}
        </label>
      )}

      <div
        className={cn(
          'flex items-center min-h-[52px] bg-white rounded-2xl border overflow-hidden',
          'transition-colors duration-150',
          error
            ? 'border-[#D81A48] focus-within:ring-1 focus-within:ring-[#D81A48]'
            : 'border-[#EFF1F5] focus-within:border-[#0669F7] focus-within:ring-1 focus-within:ring-[#0669F7]',
          disabled && 'bg-[#EFF1F5] cursor-not-allowed',
        )}
      >
        {/* Country code selector */}
        <select
          value={dialCode}
          onChange={(e) => handleDialChange(e.target.value)}
          disabled={disabled}
          aria-label="Country code"
          className={cn(
            'h-full px-3 bg-transparent border-r border-[#EFF1F5]',
            'text-[16px] text-[#25282A] focus:outline-none',
            'cursor-pointer disabled:cursor-not-allowed',
          )}
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.dial}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>

        {/* Phone number */}
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          value={rawLocal}
          onChange={handleLocalChange}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'flex-1 px-3 bg-transparent outline-none',
            'text-[16px] leading-[24px] text-[#25282A]',
            'placeholder:text-[#98A2B2]',
            'disabled:cursor-not-allowed disabled:text-[#B2B2B2]',
          )}
        />
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-[13px] leading-[18px] text-[#D81A48]">
          {error}
        </p>
      )}
    </div>
  )
}
