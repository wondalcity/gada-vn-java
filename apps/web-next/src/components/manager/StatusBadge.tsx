'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import type { SiteStatus, JobStatus, ShiftStatus } from '@/types/manager-site-job'

interface StatusBadgeProps {
  status: SiteStatus | JobStatus | ShiftStatus
}

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE:    { bg: '#E8FBE8', text: '#1A6B1A', dot: '#00C800' },
  OPEN:      { bg: '#E8FBE8', text: '#1A6B1A', dot: '#00C800' },
  COMPLETED: { bg: '#EFF1F5', text: '#98A2B2', dot: '#DBDFE9' },
  PAUSED:    { bg: '#FFF3CD', text: '#856404', dot: '#FFC72C' },
  FILLED:    { bg: '#E6F0FE', text: '#0669F7', dot: '#0669F7' },
  CANCELLED: { bg: '#FDE8EE', text: '#ED1C24', dot: '#ED1C24' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations('common.site_status')
  const style = STATUS_STYLE[status] ?? { bg: '#EFF1F5', text: '#98A2B2', dot: '#DBDFE9' }
  const label = STATUS_STYLE[status] ? t(status as keyof typeof STATUS_STYLE) : status

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
      style={{ background: style.bg, color: style.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: style.dot }} />
      {label}
    </span>
  )
}
