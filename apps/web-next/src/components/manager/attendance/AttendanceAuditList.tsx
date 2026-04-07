'use client'

import * as React from 'react'
import type { AttendanceAuditEntry } from '@/types/attendance'
import { STATUS_LABELS } from '@/lib/attendance'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

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

export default function AttendanceAuditList({ attendanceId, jobId, idToken }: Props) {
  const [entries, setEntries] = React.useState<AttendanceAuditEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setIsLoading(true)
    setError(null)
    fetch(`${API_BASE}/manager/jobs/${jobId}/attendance/${attendanceId}/audit`, {
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
  }, [attendanceId, jobId, idToken])

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
      {entries.map(entry => (
        <div key={entry.id} className="border-l-2 border-[#EFF1F5] pl-3">
          <p className="text-xs text-[#98A2B2]">
            <span className="font-medium text-[#25282A]">{entry.changerName ?? '시스템'}</span>
            {' '}이(가){' '}
            {formatKoreanDateTime(entry.changedAt)}에 변경
          </p>

          <div className="mt-1 space-y-0.5">
            {/* Status change */}
            {entry.oldStatus !== undefined && entry.newStatus !== undefined && (
              <p className="text-xs">
                <span className="text-[#98A2B2]">상태: </span>
                <span className="font-medium text-[#25282A]">
                  {STATUS_LABELS[entry.oldStatus ?? ''] ?? entry.oldStatus}
                </span>
                <span className="text-[#98A2B2]"> → </span>
                <span className={[
                  'font-medium',
                  entry.newStatus === 'ATTENDED' ? 'text-[#1A6B1A]' :
                  entry.newStatus === 'HALF_DAY' ? 'text-[#856404]' :
                  entry.newStatus === 'ABSENT' ? 'text-[#ED1C24]' :
                  'text-[#98A2B2]',
                ].join(' ')}>
                  {STATUS_LABELS[entry.newStatus ?? ''] ?? entry.newStatus}
                </span>
              </p>
            )}

            {/* Check-in change */}
            {(entry.oldCheckIn !== undefined || entry.newCheckIn !== undefined) && (
              <p className="text-xs text-[#98A2B2]">
                출근: {entry.oldCheckIn ?? '-'} → {entry.newCheckIn ?? '-'}
              </p>
            )}

            {/* Check-out change */}
            {(entry.oldCheckOut !== undefined || entry.newCheckOut !== undefined) && (
              <p className="text-xs text-[#98A2B2]">
                퇴근: {entry.oldCheckOut ?? '-'} → {entry.newCheckOut ?? '-'}
              </p>
            )}

            {/* Hours change */}
            {(entry.oldHours !== undefined || entry.newHours !== undefined) && (
              <p className="text-xs text-[#98A2B2]">
                근무시간: {entry.oldHours != null ? `${entry.oldHours}시간` : '-'} → {entry.newHours != null ? `${entry.newHours}시간` : '-'}
              </p>
            )}

            {/* Reason */}
            {entry.reason && (
              <p className="text-xs text-[#98A2B2] italic">사유: {entry.reason}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
