'use client'

import * as React from 'react'
import { cn } from '../../utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  required?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      prefix,
      suffix,
      required,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? React.useId()
    const hasError = Boolean(error)

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[14px] font-medium leading-[18px] text-on-surface"
          >
            {label}
            {required && (
              <span className="text-error ml-0.5" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <div
          className={cn(
            'flex items-center gap-2 px-4',
            'min-h-[52px] bg-surface rounded-sm border',
            'transition-colors duration-150',
            hasError
              ? 'border-error focus-within:ring-1 focus-within:ring-error'
              : 'border-outline focus-within:border-primary focus-within:ring-1 focus-within:ring-primary',
            props.disabled && 'bg-surface-container border-outline cursor-not-allowed',
          )}
        >
          {prefix && (
            <span className="flex-shrink-0 text-on-surface-variant">{prefix}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            className={cn(
              'flex-1 bg-transparent outline-none',
              'text-[16px] font-normal leading-[24px] text-on-surface',
              'placeholder:text-on-surface-variant',
              'disabled:cursor-not-allowed disabled:text-disabled',
              'min-w-0',
              className,
            )}
            {...props}
          />
          {suffix && (
            <span className="flex-shrink-0 text-on-surface-variant">{suffix}</span>
          )}
        </div>

        {(error || helperText) && (
          <p
            id={error ? `${inputId}-error` : `${inputId}-helper`}
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

Input.displayName = 'Input'
