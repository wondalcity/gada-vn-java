'use client'

import * as React from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import type { WorkerAttendanceRecord, AttendanceStatus } from '@/types/attendance'
import { STATUS_LABELS, STATUS_COLORS, formatHoursWorked } from '@/lib/attendance'

const API_BASE = '/api/v1'

type Tab = 'all' | AttendanceStatus

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',      label: '전체' },
  { key: 'ATTENDED', label: '출근' },
  { key: 'ABSENT',   label: '결근' },
  { key: 'HALF_DAY', label: '반차' },
]

function formatWorkDate(dateStr: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(dateStr))
}

export default function WorkerAttendanceClient() {
  const idToken = getSessionCookie()
  const searchParams = useSearchParams()
  const jobIdFilter = searchParams.get('jobId')

  const [records, setRecords] = React.useState<WorkerAttendanceRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<Tab>('all')

  React.useEffect(() => {
    if (!idToken) { setIsLoading(false); return }
    setIsLoading(true)
    setError(null)
    const url = jobIdFilter
      ? `${API_BASE}/workers/attendance?jobId=${jobIdFilter}`
      : `${API_BASE}/workers/attendance`
    fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message ?? '근무 이력을 불러올 수 없습니다')
        }
        return res.json()
      })
      .then(body => {
        const data: WorkerAttendanceRecord[] = body.data ?? body
        setRecords(Array.isArray(data) ? data : [])
      })
      .catch(() => setRecords([]))
      .finally(() => setIsLoading(false))
  }, [idToken, jobIdFilter])

  const filteredRecords = activeTab === 'all'
    ? records
    : records.filter(r => r.status === activeTab)

  const totalDays = records.length
  const attendedDays = records.filter(r => r.status === 'ATTENDED').length
  const absentDays = records.filter(r => r.status === 'ABSENT').length
  const halfDayDays = records.filter(r => r.status === 'HALF_DAY').length

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="py-6 flex items-center gap-3">
        <h1 className="text-xl font-bold text-[#25282A]">근무 이력</h1>
        {jobIdFilter && (
          <span className="text-xs text-[#98A2B2]">특정 일자리 필터링 중</span>
        )}
      </div>

      {/* Stats row */}
      {!isLoading && !error && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: '출근', value: attendedDays, cls: 'text-[#1A6B1A]' },
            { label: '결근', value: absentDays, cls: 'text-[#ED1C24]' },
            { label: '반차', value: halfDayDays, cls: 'text-[#856404]' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] px-4 py-3 text-center">
              <p className={`text-2xl font-bold ${cls}`}>{value}</p>
              <p className="text-xs text-[#98A2B2] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar — sticky, matches profile style */}
      <div
        className="sticky z-10 bg-white border-b border-[#EFF1F5]"
        style={{ top: 'var(--app-bar-height, 56px)' }}
      >
        <div className="flex overflow-x-auto scrollbar-hide gap-1">
          {TABS.map(tab => {
            const count = tab.key === 'all' ? 0 : displayRecords.filter(r => r.status === tab.key).length
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-[#0669F7] text-[#0669F7]'
                    : 'border-transparent text-[#7A7B7A] hover:text-[#25282A]'
                }`}
              >
                {tab.label}
                {tab.key !== 'all' && count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-[#0669F7] text-white' : 'bg-[#EFF1F5] text-[#7A7B7A]'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 animate-pulse">
                <div className="h-4 bg-[#DDDDDD] rounded w-1/2 mb-2" />
                <div className="h-3 bg-[#DDDDDD] rounded w-1/3 mb-2" />
                <div className="h-3 bg-[#DDDDDD] rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-[#ED1C24] text-sm mb-3">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-2xl border border-[#EFF1F5] text-sm text-[#25282A] hover:border-[#0669F7] transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-[#EFF1F5] shadow-sm">
            <svg className="w-14 h-14 text-[#EFF1F5] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[#25282A] text-sm font-semibold mb-1">근무 이력이 없습니다</p>
            <p className="text-[#98A2B2] text-xs">
              {activeTab === 'all'
                ? '합격 후 현장에 출근하면 여기에 기록됩니다'
                : `${STATUS_LABELS[activeTab as AttendanceStatus] ?? activeTab} 이력이 없습니다`}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filteredRecords.map(record => (
                <div key={record.id} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4">
                  {/* Date + status */}
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-[#25282A] text-sm">
                      {formatWorkDate(record.workDate)}
                    </p>
                    <span
                      className={[
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0',
                        STATUS_COLORS[record.status],
                      ].join(' ')}
                    >
                      {STATUS_LABELS[record.status]}
                    </span>
                  </div>

                  {/* Job/site info */}
                  {(record.jobTitle || record.siteName) && (
                    <p className="text-xs text-[#98A2B2] mb-1.5">
                      {record.jobTitle}
                      {record.siteName && ` · ${record.siteName}`}
                    </p>
                  )}

                  {/* Time info */}
                  {(record.checkInTime || record.checkOutTime) && (
                    <p className="text-xs text-[#25282A]">
                      {record.checkInTime ?? '--:--'}
                      {' – '}
                      {record.checkOutTime ?? '--:--'}
                      {record.hoursWorked != null && (
                        <span className="text-[#98A2B2]"> ({formatHoursWorked(record.hoursWorked)})</span>
                      )}
                    </p>
                  )}

                  {/* Notes */}
                  {record.notes && (
                    <p className="text-xs text-[#98A2B2] mt-1.5 italic">{record.notes}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Summary footer */}
            <div className="mt-6 pt-4 border-t border-[#EFF1F5]">
              <p className="text-xs text-[#98A2B2] text-center">
                총 {totalDays}일 중 출근 {attendedDays}일 (결근 {absentDays}일, 반차 {halfDayDays}일)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
