'use client'

import * as React from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  confirmVariant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const confirmClassName =
    confirmVariant === 'danger'
      ? 'px-5 py-2.5 rounded-2xl bg-[#FDE8EE] text-[#ED1C24] font-bold text-sm disabled:opacity-40'
      : 'px-5 py-2.5 rounded-2xl bg-[#0669F7] text-white font-bold text-sm disabled:opacity-40'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm p-6" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
        <h3 className="text-base font-bold text-[#25282A] mb-2">{title}</h3>
        <p className="text-sm text-[#98A2B2] mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-2xl bg-[#EFF1F5] text-[#98A2B2] font-bold text-sm disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={confirmClassName}
          >
            {isLoading ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
