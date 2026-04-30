'use client'

import * as React from 'react'
import type { AttendanceAuditEntry } from '@/types/attendance'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/attendance'

const API_BASE = '/api/v1'

interface Props {
  attendanceId: string
  jobId: string
  idToken: string
}

function formatKoreanDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

function RoleBadge({ role }: { role: 'WORKER' | 'MANAGER' | 'SYSTEM' }) {
  const labels: Record<string, string> = { WORKER: '근로자', MANAGER: '관리자', SYSTEM: '시스템' }
  const colors: Record<string, string> = {
    WORKER: 'bg-[#E3F2FD] text-[#1565C0]',
    MANAGER: 'bg-[#E8F5E9] text-[#2E7D32]',
    SYSTEM: 'bg-[#EFF1F5] text-[#7A7B7A]',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[role]}`}>
      {labels[role]}
    </span>
  )
}

export default function AttendanceAuditList({ attendanceId, idToken }: Props) {
  const [entries, setEntries] = React.useState<AttendanceAuditEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setIsLoading(true)
    setError(null)
    fetch(`${API_BASE}/attendance/${attendanceId}/history`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message ?? '변경 이력을 불러올 수 없습니다')
        }
        return res.json()
      })
      .then(body => setEntries(body.data ?? body))
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [attendanceId, idToken])

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {[1, 2].map(i => (
          <div key={i} className="h-12 bg-[#EFF1F5] rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-xs text-[#ED1C24] pt-2">{error}</p>
  }

  if (entries.length === 0) {
    return <p className="text-xs text-[#98A2B2] pt-2">변경 이력이 없습니다</p>
  }

  return (
    <div className="space-y-3 pt-2">
      {entries.map((entry, idx) => (
        <div key={entry.id} className="flex gap-2.5">
          {/* Timeline dot + line */}
          <div className="flex flex-col items-center">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${
              idx === 0 ? 'bg-[#0669F7]' : 'bg-[#DDDDDD]'
            }`} />
            {idx < entries.length - 1 && (
              <div className="w-px flex-1 bg-[#EFF1F5] mt-1 min-h-[16px]" />
            )}
          </div>
          {/* Content */}
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <RoleBadge role={entry.changedByRole} />
              {entry.changedByName && (
                <span className="text-xs font-medium text-[#25282A]">{entry.changedByName}</span>
              )}
              <span className="text-[10px] text-[#98A2B2] ml-auto">
                {formatKoreanDateTime(entry.changedAt)}
              </span>
            </div>

            {/* Status change */}
            <div className="flex items-center gap-1.5 text-xs">
              {entry.oldStatus && (
                <>
                  <span className={[
                    'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border',
                    STATUS_COLORS[entry.oldStatus] ?? 'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]',
                  ].join(' ')}>
                    {STATUS_LABELS[entry.oldStatus] ?? entry.oldStatus}
                  </span>
                  <svg
                    className="w-3 h-3 text-[#98A2B2] flex-shrink-0"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <polyline points="3,6 9,6 7,4" />
                    <polyline points="7,8 9,6" />
                  </svg>
                </>
              )}
              <span className={[
                'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border',
                STATUS_COLORS[entry.newStatus] ?? 'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]',
              ].join(' ')}>
                {STATUS_LABELS[entry.newStatus] ?? entry.newStatus}
              </span>
            </div>

            {/* Note */}
            {entry.note && (
              <p className="text-[10px] text-[#98A2B2] mt-0.5 italic">{entry.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
