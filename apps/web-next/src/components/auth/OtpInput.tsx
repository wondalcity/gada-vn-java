/**
 * OtpInput — 6-box OTP entry component.
 *
 * Each digit gets its own input box for clarity.
 * Auto-advances to the next box on digit entry.
 * Auto-submits when all 6 digits are filled (via onComplete).
 * Handles paste: pasting "123456" fills all boxes at once.
 * Handles backspace: moves focus to previous box.
 */

'use client'

import * as React from 'react'
import { cn } from '@gada/ui'

interface OtpInputProps {
  value: string           // 6-character string
  onChange: (otp: string) => void
  onComplete?: (otp: string) => void
  error?: boolean
  disabled?: boolean
  length?: number
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
  length = 6,
}: OtpInputProps) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(length, ' ').slice(0, length).split('')

  const handleChange = (index: number, char: string) => {
    // Accept only single digit
    const digit = char.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = digit
    const newValue = newDigits.join('').replace(/ /g, '')
    onChange(newValue)

    // Auto-advance
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus()
    }

    // Auto-submit when complete
    if (newValue.replace(/\s/g, '').length === length) {
      onComplete?.(newValue)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Empty box: backspace moves to previous
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        onChange(newDigits.join(''))
        refs.current[index - 1]?.focus()
      } else {
        // Clear current box
        const newDigits = [...digits]
        newDigits[index] = ''
        onChange(newDigits.join(''))
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted.padEnd(length, ' ').slice(0, length))
    if (pasted.length === length) onComplete?.(pasted)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center" role="group" aria-label="OTP input">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === ' ' ? '' : digits[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          enterKeyHint={i === length - 1 ? 'done' : 'next'}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            'w-12 h-14 text-center rounded-2xl border',
            'text-[24px] font-bold text-[#25282A]',
            'transition-colors duration-150 outline-none',
            'focus:border-[#0669F7] focus:ring-1 focus:ring-[#0669F7]',
            error
              ? 'border-[#ED1C24] bg-[#FFF6F7]'
              : digits[i] && digits[i] !== ' '
              ? 'border-[#0669F7] bg-[#F5F9FF]'
              : 'border-[#EFF1F5] bg-white',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
      ))}
    </div>
  )
}
