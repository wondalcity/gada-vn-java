'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'
import { formatDate } from '@/lib/utils/date'
import type { RosterEntry, AttendanceStatus } from '@/types/attendance'
import { STATUS_LABELS } from '@/lib/attendance'
import AttendanceWorkerRow, { type DraftRecord } from './AttendanceWorkerRow'

const API_BASE = '/api/v1'

interface Props {
  jobId: string
  locale: string
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function rosterToDraft(entry: RosterEntry): DraftRecord {
  return {
    workerId: entry.workerId,
    workerName: entry.workerName,
    workerPhone: entry.workerPhone,
    tradeNameKo: entry.tradeNameKo,
    experienceMonths: entry.experienceMonths,
    attendanceId: entry.attendance?.id,
    status: entry.attendance?.status ?? 'PENDING',
    checkInTime: entry.attendance?.checkInTime ?? '',
    checkOutTime: entry.attendance?.checkOutTime ?? '',
    hoursWorked: entry.attendance?.hoursWorked ?? null,
    notes: entry.attendance?.notes ?? '',
    isDirty: false,
  }
}

interface RosterMeta {
  jobTitle?: string
}

export default function AttendanceManagerClient({ jobId, locale }: Props) {
  const t = useTranslations('common')
  const idToken = getSessionCookie()

  const today = React.useMemo(() => new Date(), [])
  const [selectedDate, setSelectedDate] = React.useState<Date>(today)
  const [drafts, setDrafts] = React.useState<DraftRecord[]>([])
  const [savedDrafts, setSavedDrafts] = React.useState<DraftRecord[]>([])
  const [meta, setMeta] = React.useState<RosterMeta>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [savingId, setSavingId] = React.useState<string | null>(null)
  const [isSavingAll, setIsSavingAll] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  const dateStr = toDateString(selectedDate)

  // Fetch roster
  React.useEffect(() => {
    if (!idToken) return
    setIsLoading(true)
    setError(null)
    fetch(`${API_BASE}/manager/jobs/${jobId}/attendance?date=${dateStr}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message ?? t('manager_attendance.error_load'))
        }
        return res.json()
      })
      .then(body => {
        const data = body.data ?? body
        const roster: RosterEntry[] = Array.isArray(data.roster) ? data.roster : Array.isArray(data) ? data : []
        const initialDrafts = roster.map(rosterToDraft)
        setDrafts(initialDrafts)
        setSavedDrafts(initialDrafts.map(d => ({ ...d })))
        setMeta({ jobTitle: data.jobTitle ?? data.job_title })
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [idToken, jobId, dateStr])

  function updateDraft(workerId: string, partial: Partial<DraftRecord>) {
    setDrafts(prev => prev.map(d => d.workerId === workerId ? { ...d, ...partial } : d))
  }

  async function saveRow(workerId: string) {
    const draft = drafts.find(d => d.workerId === workerId)
    if (!draft || !idToken) return
    setSavingId(workerId)
    setSaveError(null)
    try {
      const res = await fetch(`${API_BASE}/manager/jobs/${jobId}/attendance`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          work_date: dateStr,
          records: [{
            worker_id:      draft.workerId,
            status:         draft.status,
            check_in_time:  draft.checkInTime || null,
            check_out_time: draft.checkOutTime || null,
            hours_worked:   draft.hoursWorked,
            notes:          draft.notes || null,
          }],
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? t('manager_attendance.error_save'))
      }
      // Mark as clean and update savedDrafts
      setDrafts(prev => prev.map(d => d.workerId === workerId ? { ...d, isDirty: false } : d))
      setSavedDrafts(prev => prev.map(d => d.workerId === workerId ? { ...draft, isDirty: false } : d))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('manager_attendance.error_save'))
    } finally {
      setSavingId(null)
    }
  }

  async function saveAll() {
    const dirtyDrafts = drafts.filter(d => d.isDirty)
    if (dirtyDrafts.length === 0 || !idToken) return
    setIsSavingAll(true)
    setSaveError(null)
    try {
      const res = await fetch(`${API_BASE}/manager/jobs/${jobId}/attendance`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          work_date: dateStr,
          records: dirtyDrafts.map(d => ({
            worker_id:      d.workerId,
            status:         d.status,
            check_in_time:  d.checkInTime || null,
            check_out_time: d.checkOutTime || null,
            hours_worked:   d.hoursWorked,
            notes:          d.notes || null,
          })),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? t('manager_attendance.error_save'))
      }
      setDrafts(prev => prev.map(d => ({ ...d, isDirty: false })))
      setSavedDrafts(drafts.map(d => ({ ...d, isDirty: false })))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('manager_attendance.error_save'))
    } finally {
      setIsSavingAll(false)
    }
  }

  function markAllPresent() {
    setDrafts(prev => prev.map(d =>
      d.status === 'PENDING' ? { ...d, status: 'ATTENDED' as AttendanceStatus, isDirty: true } : d
    ))
  }

  // Stats
  const totalWorkers = drafts.length
  const attendedCount = drafts.filter(d => d.status === 'ATTENDED').length
  const halfDayCount = drafts.filter(d => d.status === 'HALF_DAY').length
  const absentCount = drafts.filter(d => d.status === 'ABSENT').length
  const pendingCount = drafts.filter(d => d.status === 'PENDING').length
  const dirtyCount = drafts.filter(d => d.isDirty).length

  return (
    <div className="max-w-[1760px] mx-auto px-4 pb-10">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#EFF1F5] pt-4 pb-3 space-y-3">
        {/* Date selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate(d => addDays(d, -1))}
              className="p-1.5 rounded-2xl border border-[#EFF1F5] hover:border-[#DDDDDD] transition-colors"
              aria-label={t('manager_attendance.prev_day')}
            >
              <svg className="w-4 h-4 text-[#25282A]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <polyline points="10,3 5,8 10,13" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-[#25282A] min-w-[160px] text-center">
              {formatDate(selectedDate, locale)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              className="p-1.5 rounded-2xl border border-[#EFF1F5] hover:border-[#DDDDDD] transition-colors"
              aria-label={t('manager_attendance.next_day')}
            >
              <svg className="w-4 h-4 text-[#25282A]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <polyline points="6,3 11,8 6,13" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(today)}
            className="px-3 py-1.5 rounded-2xl border border-[#EFF1F5] text-xs text-[#98A2B2] hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
          >
            {t('manager_attendance.today')}
          </button>
        </div>

        {/* Roster meta */}
        {!isLoading && !error && (
          <div>
            {meta.jobTitle && (
              <p className="text-sm font-semibold text-[#25282A] mb-1">{meta.jobTitle}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#98A2B2]">
                {t('manager_attendance.workers_scheduled', { total: totalWorkers, attended: attendedCount })}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: t('manager_attendance.status_attended'), count: attendedCount, cls: 'bg-[#E6F9E6] text-[#1A6B1A] border-[#86D98A]' },
                  { label: t('manager_attendance.status_half_day'), count: halfDayCount, cls: 'bg-[#FFF8E6] text-[#856404] border-[#F5D87D]' },
                  { label: t('manager_attendance.status_absent'), count: absentCount, cls: 'bg-[#FDE8EE] text-[#ED1C24] border-[#F4A8B8]' },
                  { label: t('manager_attendance.status_pending'), count: pendingCount, cls: 'bg-[#EFF1F5] text-[#98A2B2] border-[#EFF1F5]' },
                ].map(({ label, count, cls }) => (
                  <span key={label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
                    {label} {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bulk action bar */}
        {!isLoading && !error && drafts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={markAllPresent}
              className="px-3 py-1.5 rounded-2xl border border-[#EFF1F5] text-xs text-[#25282A] font-medium hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
            >
              {t('manager_attendance.mark_all_present')}
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={isSavingAll || dirtyCount === 0}
              className="px-4 py-1.5 rounded-2xl bg-[#0669F7] text-white text-xs font-medium disabled:opacity-50 hover:bg-[#0557D4] transition-colors"
            >
              {isSavingAll ? t('manager_attendance.saving') : t('manager_attendance.save_all')}
            </button>
            {dirtyCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FFF8E6] text-[#856404] border border-[#F5D87D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFC72C]" />
                {t('manager_attendance.unsaved_count', { count: dirtyCount })}
              </span>
            )}
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <p className="text-xs text-[#ED1C24]">{saveError}</p>
        )}
      </div>

      {/* Content */}
      <div className="pt-4 space-y-2">
        {isLoading ? (
          // Skeleton
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#DDDDDD]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#DDDDDD] rounded w-1/3" />
                    <div className="h-3 bg-[#DDDDDD] rounded w-1/2" />
                  </div>
                  <div className="h-6 bg-[#DDDDDD] rounded-full w-16" />
                </div>
              </div>
            ))}
          </>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-[#ED1C24] text-sm mb-3">{error}</p>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date(selectedDate))}
              className="px-4 py-2 rounded-2xl border border-[#EFF1F5] text-sm text-[#25282A] hover:border-[#0669F7] transition-colors"
            >
              {t('manager_attendance.retry')}
            </button>
          </div>
        ) : drafts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#98A2B2] text-sm font-medium">{t('manager_attendance.empty_title')}</p>
            <p className="text-[#98A2B2] text-xs mt-1">{t('manager_attendance.empty_subtitle')}</p>
          </div>
        ) : (
          <>
            {drafts.map(draft => (
              <AttendanceWorkerRow
                key={draft.workerId}
                draft={draft}
                savedDraft={savedDrafts.find(s => s.workerId === draft.workerId) ?? draft}
                onChange={partial => updateDraft(draft.workerId, partial)}
                onSaveRow={() => saveRow(draft.workerId)}
                isSaving={savingId === draft.workerId}
                jobId={jobId}
                idToken={idToken ?? ''}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
