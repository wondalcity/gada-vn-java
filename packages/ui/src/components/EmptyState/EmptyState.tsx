import * as React from 'react'
import { cn } from '../../utils/cn'

export type EmptyStateVariant = 'default' | 'search' | 'error' | 'offline'

export interface EmptyStateProps {
  variant?: EmptyStateVariant
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: React.ReactNode
  className?: string
}

const defaultIcons: Record<EmptyStateVariant, React.ReactNode> = {
  default: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="24" fill="#F2F2F2"/>
      <path d="M24 16v8m0 8h.01" stroke="#7A7B7A" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  search: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="24" fill="#F2F2F2"/>
      <circle cx="22" cy="22" r="7" stroke="#7A7B7A" strokeWidth="2"/>
      <path d="M27 27l5 5" stroke="#7A7B7A" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  error: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="24" fill="#FFEFF1"/>
      <path d="M24 18v7m0 6h.01" stroke="#ED1C24" strokeWidth="2" strokeLinecap="round"/>
      <path d="M20.3 14h7.4l5.3 9.2-5.3 9.2H20.3L15 23.2 20.3 14z"
        stroke="#ED1C24" strokeWidth="2" fill="none"/>
    </svg>
  ),
  offline: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="24" fill="#F2F2F2"/>
      <path d="M8 8l32 32" stroke="#7A7B7A" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16.7 16.7A16 16 0 0140 24M8 24a16 16 0 014.1-10.7M20 28a5.7 5.7 0 018 0M14 22a11.5 11.5 0 0114-2.4M24 35h.01"
        stroke="#7A7B7A" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'default',
  title,
  description,
  action,
  icon,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4">{icon ?? defaultIcons[variant]}</div>

      <h3 className="text-[16px] font-bold leading-[20px] text-on-surface mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-[14px] leading-[20px] text-on-surface-variant max-w-[280px]">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'mt-5 min-h-[44px] px-6 rounded-full',
            'bg-primary text-primary-on',
            'text-[14px] font-bold',
            'hover:bg-primary-hover active:bg-primary-active',
            'transition-colors duration-150',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
