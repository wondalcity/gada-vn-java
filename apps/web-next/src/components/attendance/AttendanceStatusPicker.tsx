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
      status: 'EARLY_LEAVE',
      label: '조퇴',
      selectedClass: 'border-[#FFCC80] bg-[#FFE0B2] text-[#BF360C]',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <polyline points="10,3 14,8 10,13" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="4" x2="7" y2="4" />
          <line x1="2" y1="12" x2="7" y2="12" />
        </svg>
      ),
    },
    {
      status: 'PRE_CONFIRMED',
      label: '출근 예정',
      selectedClass: 'border-[#90CAF9] bg-[#E3F2FD] text-[#1565C0]',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="12" height="11" rx="2" />
          <line x1="5" y1="1" x2="5" y2="5" />
          <line x1="11" y1="1" x2="11" y2="5" />
          <polyline points="5,9 7,11 11,7" />
        </svg>
      ),
    },
    {
      status: 'COMMUTING',
      label: '출근 중',
      selectedClass: 'border-[#FFCC80] bg-[#FFF3E0] text-[#E65100]',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="4.5" cy="11.5" r="1.5" />
          <circle cx="11.5" cy="11.5" r="1.5" />
          <path d="M3 11.5H2V8l2-4h7l2 3.5V11.5H13" />
          <line x1="6" y1="11.5" x2="10" y2="11.5" />
        </svg>
      ),
    },
    {
      status: 'WORK_STARTED',
      label: '작업 시작',
      selectedClass: 'border-[#A5D6A7] bg-[#E8F5E9] text-[#2E7D32]',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="8" cy="8" r="6" />
          <polyline points="6,8 8,10 11,6" />
        </svg>
      ),
    },
    {
      status: 'WORK_COMPLETED',
      label: '작업 마감',
      selectedClass: 'border-[#CE93D8] bg-[#F3E5F5] text-[#6A1B9A]',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="2,8 6,12 14,4" />
          <polyline points="10,12 14,12" />
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
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
      role="group"
      aria-label={t('worker_attendance.status_group_label')}
    >
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
              'py-3 rounded-3xl text-sm font-medium border-2 transition-all flex flex-col items-center gap-1',
              isSelected
                ? selectedClass
                : 'border-outline text-on-surface-variant hover:border-outline',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {icon}
            <span className="text-xs leading-tight text-center">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
