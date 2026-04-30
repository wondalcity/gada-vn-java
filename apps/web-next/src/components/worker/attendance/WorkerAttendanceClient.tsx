'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import type { WorkerAttendanceRecord, AttendanceStatus, StatusHistoryEntry } from '@/types/attendance'
import { STATUS_COLORS, STATUS_LABELS, formatHoursWorked } from '@/lib/attendance'

const API_BASE = '/api/v1'

type Tab = 'all' | AttendanceStatus

function formatWorkDate(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(dateStr))
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

function isToday(dateStr: string): boolean {
  const today = new Date()
  const date = new Date(dateStr)
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const date = new Date(dateStr)
  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  )
}

function isWithinTwoHoursOfStart(workStartTime?: string): boolean {
  if (!workStartTime) return true // default: allow action if no start time
  const [h, m] = workStartTime.split(':').map(Number)
  const now = new Date()
  const startMinutes = h * 60 + m
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const diff = startMinutes - nowMinutes
  return diff <= 120
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

interface HistoryTimelineProps {
  history: StatusHistoryEntry[]
}

function HistoryTimeline({ history }: HistoryTimelineProps) {
  if (history.length === 0) {
    return <p className="text-xs text-[#98A2B2] py-2">변경 이력이 없습니다</p>
  }
  return (
    <div className="space-y-3 pt-1">
      {history.map((entry, idx) => (
        <div key={entry.id} className="flex gap-2.5">
          {/* Timeline dot + line */}
          <div className="flex flex-col items-center">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${
              idx === 0 ? 'bg-[#0669F7]' : 'bg-[#DDDDDD]'
            }`} />
            {idx < history.length - 1 && (
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
              <span className="text-[10px] text-[#98A2B2] ml-auto">{formatDateTime(entry.changedAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {entry.oldStatus && (
                <>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[entry.oldStatus] ?? 'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]'}`}>
                    {STATUS_LABELS[entry.oldStatus] ?? entry.oldStatus}
                  </span>
                  <svg className="w-3 h-3 text-[#98A2B2] flex-shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <polyline points="3,6 9,6 7,4" />
                    <polyline points="7,8 9,6" />
                  </svg>
                </>
              )}
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[entry.newStatus] ?? 'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]'}`}>
                {STATUS_LABELS[entry.newStatus] ?? entry.newStatus}
              </span>
            </div>
            {entry.note && (
              <p className="text-[10px] text-[#98A2B2] mt-0.5 italic">{entry.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

interface WorkerActionButtonsProps {
  record: WorkerAttendanceRecord
  onAction: (recordId: string, status: AttendanceStatus) => Promise<void>
  actionLoading: string | null
}

function WorkerActionButtons({ record, onAction, actionLoading }: WorkerActionButtonsProps) {
  const today = isToday(record.workDate)
  const tomorrow = isTomorrow(record.workDate)
  const withinTwoHours = isWithinTwoHoursOfStart(record.workStartTime)
  const isLoadingThis = actionLoading === record.id

  // Only show actions for today/tomorrow records that aren't finalized
  const isFinalized = record.status === 'ATTENDED' || record.status === 'ABSENT' || record.status === 'EARLY_LEAVE'
  if (isFinalized) return null
  if (!today && !tomorrow) return null

  const buttons: { status: AttendanceStatus; label: string; cls: string; show: boolean }[] = [
    {
      status: 'PRE_CONFIRMED',
      label: '출근 예정 확인',
      cls: 'bg-[#E3F2FD] text-[#1565C0] border-[#90CAF9] hover:bg-[#BBDEFB]',
      show: tomorrow || (today && record.workerStatus == null && record.status === 'PENDING'),
    },
    {
      status: 'COMMUTING',
      label: '출근 중',
      cls: 'bg-[#FFF3E0] text-[#E65100] border-[#FFCC80] hover:bg-[#FFE0B2]',
      show: today && withinTwoHours && record.status !== 'COMMUTING' && record.status !== 'WORK_STARTED' && record.status !== 'WORK_COMPLETED',
    },
    {
      status: 'WORK_STARTED',
      label: '작업 시작',
      cls: 'bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7] hover:bg-[#C8E6C9]',
      show: today && (record.workerStatus === 'COMMUTING' || record.status === 'COMMUTING'),
    },
    {
      status: 'WORK_COMPLETED',
      label: '작업 마감',
      cls: 'bg-[#F3E5F5] text-[#6A1B9A] border-[#CE93D8] hover:bg-[#E1BEE7]',
      show: today && (record.workerStatus === 'WORK_STARTED' || record.status === 'WORK_STARTED'),
    },
    {
      status: 'EARLY_LEAVE',
      label: '조퇴',
      cls: 'bg-[#FFE0B2] text-[#BF360C] border-[#FFCC80] hover:bg-[#FFCC80]',
      show: today && (record.status === 'WORK_STARTED' || record.workerStatus === 'WORK_STARTED'),
    },
  ]

  const visibleButtons = buttons.filter(b => b.show)
  if (visibleButtons.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {visibleButtons.map(btn => (
        <button
          key={btn.status}
          type="button"
          disabled={isLoadingThis}
          onClick={() => onAction(record.id, btn.status)}
          className={`px-3 py-1.5 rounded-2xl border text-xs font-medium transition-colors disabled:opacity-50 ${btn.cls}`}
        >
          {isLoadingThis ? '처리 중...' : btn.label}
        </button>
      ))}
    </div>
  )
}

interface AttendanceCardProps {
  record: WorkerAttendanceRecord
  locale: string
  statusLabels: Record<string, string>
  onAction: (recordId: string, status: AttendanceStatus) => Promise<void>
  actionLoading: string | null
}

function AttendanceCard({ record, locale, statusLabels, onAction, actionLoading }: AttendanceCardProps) {
  const [showHistory, setShowHistory] = React.useState(false)
  const history = record.statusHistory ?? []
  const hasDualStatus =
    record.workerStatus != null &&
    record.managerStatus != null &&
    record.workerStatus !== record.managerStatus

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4">
      {/* Date + status */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-[#25282A] text-sm">
            {formatWorkDate(record.workDate, locale)}
          </p>
          {(record.jobTitle || record.siteName) && (
            <p className="text-xs text-[#98A2B2] mt-0.5">
              {record.jobTitle}
              {record.siteName && ` · ${record.siteName}`}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
          <span
            className={[
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
              STATUS_COLORS[record.status] ?? 'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]',
            ].join(' ')}
          >
            {statusLabels[record.status] ?? record.status}
          </span>
          {record.updatedByRole && (
            <RoleBadge role={record.updatedByRole} />
          )}
        </div>
      </div>

      {/* Dual status row */}
      {hasDualStatus && (
        <div className="flex items-center gap-2 flex-wrap mb-2 p-2 bg-[#FAFAFA] rounded-xl border border-[#EFF1F5]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#98A2B2]">자가 입력</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[record.workerStatus!] ?? 'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]'}`}>
              {statusLabels[record.workerStatus!] ?? record.workerStatus}
            </span>
          </div>
          <svg className="w-3 h-3 text-[#98A2B2] flex-shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
            <polyline points="3,6 9,6 7,4" />
            <polyline points="7,8 9,6" />
          </svg>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#98A2B2]">관리자</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[record.managerStatus!] ?? 'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]'}`}>
              {statusLabels[record.managerStatus!] ?? record.managerStatus}
            </span>
          </div>
        </div>
      )}

      {/* Work duration */}
      {(record.workHours != null || record.workMinutes != null) && (
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-3.5 h-3.5 text-[#98A2B2] flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
            <circle cx="8" cy="8" r="6" />
            <polyline points="8,5 8,8 10.5,8" />
          </svg>
          <span className="text-xs text-[#25282A]">
            근무 {formatHoursWorked(record.workHours, record.workMinutes)}
          </span>
          {record.workDurationConfirmed ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E6F9E6] text-[#1A6B1A]">확정</span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EFF1F5] text-[#7A7B7A]">미확정</span>
          )}
          {record.workDurationSetBy && (
            <RoleBadge role={record.workDurationSetBy} />
          )}
        </div>
      )}

      {/* Notes */}
      {record.notes && (
        <p className="text-xs text-[#98A2B2] mb-2 italic">{record.notes}</p>
      )}

      {/* Quick action buttons */}
      <WorkerActionButtons
        record={record}
        onAction={onAction}
        actionLoading={actionLoading}
      />

      {/* History toggle */}
      {history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#EFF1F5]">
          <button
            type="button"
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1.5 text-xs text-[#0669F7] font-medium"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`}
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <polyline points="3,5 7,9 11,5" />
            </svg>
            {showHistory ? '이력 닫기' : `이력 보기 (${history.length}건)`}
          </button>
          {showHistory && (
            <div className="mt-2">
              <HistoryTimeline history={history} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function WorkerAttendanceClient() {
  const t = useTranslations('worker.attendance')
  const idToken = getSessionCookie()
  const searchParams = useSearchParams()
  const jobIdFilter = searchParams.get('jobId')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all',           label: t('tab_all') },
    { key: 'PRE_CONFIRMED', label: t('tab_pre_confirmed') },
    { key: 'WORK_STARTED',  label: t('tab_work_started') },
    { key: 'ATTENDED',      label: t('tab_attended') },
    { key: 'ABSENT',        label: t('tab_absent') },
    { key: 'EARLY_LEAVE',   label: t('tab_early_leave') },
  ]

  const statusLabels: Record<string, string> = {
    PENDING:        t('status_pending'),
    PRE_CONFIRMED:  t('status_pre_confirmed'),
    COMMUTING:      t('status_commuting'),
    WORK_STARTED:   t('status_work_started'),
    WORK_COMPLETED: t('status_work_completed'),
    ATTENDED:       t('status_attended'),
    ABSENT:         t('status_absent'),
    HALF_DAY:       t('tab_half_day'),
    EARLY_LEAVE:    t('status_early_leave'),
  }

  const [records, setRecords] = React.useState<WorkerAttendanceRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<Tab>('all')
  const [locale, setLocale] = React.useState('ko')
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLocale(document.documentElement.lang || navigator.language || 'ko')
  }, [])

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
          throw new Error(body.message ?? t('load_error'))
        }
        return res.json()
      })
      .then(body => {
        const data: WorkerAttendanceRecord[] = body.data ?? body
        setRecords(Array.isArray(data) ? data : [])
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : t('load_error'))
        setRecords([])
      })
      .finally(() => setIsLoading(false))
  }, [idToken, jobIdFilter])

  async function handleWorkerAction(recordId: string, status: AttendanceStatus) {
    if (!idToken) return
    setActionLoading(recordId)
    try {
      const res = await fetch(`${API_BASE}/attendance/${recordId}/worker-status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? '상태 업데이트에 실패했습니다')
      }
      const body = await res.json()
      const updated: WorkerAttendanceRecord = body.data ?? body
      setRecords(prev =>
        prev.map(r => r.id === recordId ? { ...r, ...updated } : r)
      )
    } catch {
      // silently fail — could show toast here
    } finally {
      setActionLoading(null)
    }
  }

  const filteredRecords = activeTab === 'all'
    ? records
    : records.filter(r => r.status === activeTab || r.workerStatus === activeTab)

  const totalDays = records.length
  const attendedDays = records.filter(r => r.status === 'ATTENDED').length
  const absentDays = records.filter(r => r.status === 'ABSENT').length
  const halfDayDays = records.filter(r => r.status === 'HALF_DAY').length
  const preConfirmedCount = records.filter(r => r.status === 'PRE_CONFIRMED' || r.workerStatus === 'PRE_CONFIRMED').length
  const workStartedCount = records.filter(r => r.status === 'WORK_STARTED' || r.workerStatus === 'WORK_STARTED').length

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="py-6 flex items-center gap-3">
        <h1 className="text-xl font-bold text-[#25282A]">{t('title')}</h1>
        {jobIdFilter && (
          <span className="text-xs text-[#98A2B2]">{t('filtering')}</span>
        )}
      </div>

      {/* Stats row */}
      {!isLoading && !error && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: t('tab_attended'),      value: attendedDays,       cls: 'text-[#1A6B1A]' },
            { label: t('tab_absent'),         value: absentDays,         cls: 'text-[#ED1C24]' },
            { label: t('tab_pre_confirmed'),  value: preConfirmedCount,  cls: 'text-[#1565C0]' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] px-4 py-3 text-center">
              <p className={`text-2xl font-bold ${cls}`}>{value}</p>
              <p className="text-xs text-[#98A2B2] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div
        className="sticky z-10 bg-white border-b border-[#EFF1F5]"
        style={{ top: 'var(--app-bar-height, 56px)' }}
      >
        <div className="flex overflow-x-auto scrollbar-hide gap-1">
          {TABS.map(tab => {
            const count =
              tab.key === 'all'
                ? 0
                : records.filter(r => r.status === tab.key || r.workerStatus === tab.key).length
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
              {t('retry')}
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-[#EFF1F5] shadow-sm">
            <svg className="w-14 h-14 text-[#EFF1F5] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[#25282A] text-sm font-semibold mb-1">{t('empty_title')}</p>
            <p className="text-[#98A2B2] text-xs">
              {activeTab === 'all'
                ? t('empty_hint')
                : t('empty_status', { status: TABS.find(tab => tab.key === activeTab)?.label ?? activeTab })}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filteredRecords.map(record => (
                <AttendanceCard
                  key={record.id}
                  record={record}
                  locale={locale}
                  statusLabels={statusLabels}
                  onAction={handleWorkerAction}
                  actionLoading={actionLoading}
                />
              ))}
            </div>

            {/* Summary footer */}
            <div className="mt-6 pt-4 border-t border-[#EFF1F5]">
              <p className="text-xs text-[#98A2B2] text-center">
                {t('summary', { total: totalDays, attended: attendedDays, absent: absentDays, halfDay: halfDayDays })}
              </p>
              {workStartedCount > 0 && (
                <p className="text-xs text-[#2E7D32] text-center mt-1">
                  현재 작업 중 {workStartedCount}건
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
