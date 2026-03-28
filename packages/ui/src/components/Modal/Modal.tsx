'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'

export type ModalSize = 'sm' | 'md' | 'lg'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  size?: ModalSize
  closeOnBackdrop?: boolean
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}) => {
  const titleId = React.useId()
  const descId = React.useId()

  // Close on Escape
  React.useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Lock body scroll
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(0,0,0,0.30)]"
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative w-full bg-surface rounded-sm shadow-xl',
          'max-h-[90vh] overflow-y-auto',
          sizeStyles[size],
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="p-5 pb-4">
            {title && (
              <h2 id={titleId} className="text-[18px] font-bold leading-[23px] text-on-surface pr-8">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="mt-1.5 text-[14px] leading-[20px] text-on-surface-variant">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-sm text-on-surface-variant hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Content */}
        {children && (
          <div className={cn('px-5', !(title || description) && 'pt-5', !footer && 'pb-5')}>
            {children}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-outline">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : null
}
