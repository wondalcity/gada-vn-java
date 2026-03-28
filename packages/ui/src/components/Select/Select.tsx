'use client'

import * as React from 'react'
import { cn } from '../../utils/cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  required?: boolean
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      options,
      placeholder,
      required,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const selectId = id ?? React.useId()
    const hasError = Boolean(error)

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="text-[14px] font-medium leading-[18px] text-on-surface"
          >
            {label}
            {required && (
              <span className="text-error ml-0.5" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            className={cn(
              'w-full appearance-none',
              'min-h-[52px] px-4 pr-10',
              'bg-surface rounded-sm border',
              'text-[16px] font-normal leading-[24px] text-on-surface',
              'transition-colors duration-150',
              'focus:outline-none',
              hasError
                ? 'border-error focus:ring-1 focus:ring-error'
                : 'border-outline focus:border-primary focus:ring-1 focus:ring-primary',
              props.disabled && 'bg-surface-container cursor-not-allowed text-disabled',
              !props.value && placeholder && 'text-on-surface-variant',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Chevron icon */}
          <span
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        {(error || helperText) && (
          <p
            id={error ? `${selectId}-error` : `${selectId}-helper`}
            className={cn(
              'text-[13px] leading-[18px]',
              error ? 'text-error' : 'text-on-surface-variant',
            )}
          >
            {error ?? helperText}
          </p>
        )}
      </div>
    )
  },
)

Select.displayName = 'Select'
