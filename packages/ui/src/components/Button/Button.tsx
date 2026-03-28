'use client'

import * as React from 'react'
import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-primary text-primary-on',
    'hover:bg-primary-hover active:bg-primary-active',
    'disabled:bg-disabled disabled:text-white disabled:cursor-not-allowed',
    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ].join(' '),
  secondary: [
    'bg-transparent border border-primary text-primary',
    'hover:bg-primary-8 active:bg-primary-16',
    'disabled:border-disabled disabled:text-disabled disabled:cursor-not-allowed',
    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ].join(' '),
  ghost: [
    'bg-transparent text-primary',
    'hover:bg-primary-8 active:bg-primary-16',
    'disabled:text-disabled disabled:cursor-not-allowed',
    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ].join(' '),
  danger: [
    'bg-error text-error-on',
    'hover:bg-error-hover active:bg-[#861E21]',
    'disabled:bg-disabled disabled:text-white disabled:cursor-not-allowed',
    'focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[14px] font-medium leading-[14px] gap-1.5',
  md: 'h-11 px-4 text-[16px] font-bold leading-[16px] gap-2',
  lg: 'h-14 px-6 text-[18px] font-bold leading-[18px] gap-2',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base
          'inline-flex items-center justify-center rounded-sm',
          'font-sans select-none outline-none',
          'transition-colors duration-150',
          // Variant
          variantStyles[variant],
          // Size
          sizeStyles[size],
          // Full width
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Spinner size={size} />
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'

function Spinner({ size }: { size: ButtonSize }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
  return (
    <svg
      className={cn('animate-spin', s)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
