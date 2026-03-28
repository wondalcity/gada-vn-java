'use client'

import * as React from 'react'
import type { SiteStatus, JobStatus, ShiftStatus } from '@/types/manager-site-job'

interface StatusBadgeProps {
  status: SiteStatus | JobStatus | ShiftStatus
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  ACTIVE:    { label: '운영중',   bg: '#E8FBE8', text: '#1A6B1A', dot: '#00C800' },
  OPEN:      { label: '모집중',   bg: '#E8FBE8', text: '#1A6B1A', dot: '#00C800' },
  COMPLETED: { label: '완료',    bg: '#EFF1F5', text: '#98A2B2', dot: '#DBDFE9' },
  PAUSED:    { label: '일시중지', bg: '#FFF3CD', text: '#856404', dot: '#FDBC08' },
  FILLED:    { label: '마감',    bg: '#E6F0FE', text: '#0669F7', dot: '#0669F7' },
  CANCELLED: { label: '취소',    bg: '#FDE8EE', text: '#D81A48', dot: '#D81A48' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, bg: '#EFF1F5', text: '#98A2B2', dot: '#DBDFE9' }

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
      style={{ background: config.bg, color: config.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: config.dot }} />
      {config.label}
    </span>
  )
}
