'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import type { AttendanceStatus } from '@/types/attendance'

interface Props {
  value: AttendanceStatus
  onChange: (s: AttendanceStatus) => void
  disabled?: boolean
}

type Option = {
  status: AttendanceStatus
  label: string
  selectedClass: string
  icon: React.ReactNode
}

export default function AttendanceStatusPicker({ value, onChange, disabled }: Props) {
  const t = useTranslations('common')

  const OPTIONS: Option[] = [
    {
      status: 'ATTENDED',
      label: t('worker_attendance.attended'),
      selectedClass: 'border-[#00C800] bg-[#E6F9E6] text-[#1A6B1A]',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="2,8 6,12 14,4" />
        </svg>
      ),
    },
    {
      status: 'HALF_DAY',
      label: t('worker_attendance.half_day'),
      selectedClass: 'border-[#FFC72C] bg-[#FFF8E6] text-[#856404]',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 2a6 6 0 0 0 0 12V2z" />
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      status: 'ABSENT',
      label: t('worker_attendance.absent'),
      selectedClass: 'border-error bg-[#FDE8EE] text-error',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="3" x2="13" y2="13" />
          <line x1="13" y1="3" x2="3" y2="13" />
        </svg>
      ),
    },
    {
      status: 'PENDING',
      label: t('worker_attendance.pending'),
      selectedClass: 'border-outline bg-surface-container text-on-surface-variant',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <circle cx="8" cy="8" r="6" />
          <line x1="8" y1="5" x2="8" y2="9" />
          <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex gap-2" role="group" aria-label={t('worker_attendance.status_group_label')}>
      {OPTIONS.map(({ status, label, selectedClass, icon }) => {
        const isSelected = value === status
        return (
          <button
            key={status}
            type="button"
            onClick={() => !disabled && onChange(status)}
            disabled={disabled}
            aria-pressed={isSelected}
            className={[
              'flex-1 py-3 rounded-3xl text-sm font-medium border-2 transition-all flex flex-col items-center gap-1',
              isSelected
                ? selectedClass
                : 'border-outline text-on-surface-variant hover:border-outline',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {icon}
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
