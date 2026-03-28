'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** Stack above other bottom sheets */
  zIndex?: number
  /** Extend to full screen height */
  fullScreen?: boolean
  /** Max height as CSS value. Default: 90vh */
  maxHeight?: string
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  children,
  zIndex = 50,
  fullScreen = false,
  maxHeight = '90vh',
}) => {
  const titleId = React.useId()

  React.useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const content = (
    <div
      className="fixed inset-0 flex flex-col justify-end animate-fade-in"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(0,0,0,0.30)]"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'relative bg-surface',
          fullScreen ? 'rounded-none h-full' : 'rounded-t-[16px]',
          'overflow-hidden flex flex-col animate-slide-up',
        )}
        style={{ maxHeight: fullScreen ? '100%' : maxHeight }}
      >
        {/* Handle */}
        {!fullScreen && (
          <div
            className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          >
            <div className="w-10 h-1 rounded-full bg-outline" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
            <h2
              id={titleId}
              className="text-[18px] font-bold leading-[23px] text-on-surface"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-sm text-on-surface-variant hover:bg-surface-container"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : null
}
