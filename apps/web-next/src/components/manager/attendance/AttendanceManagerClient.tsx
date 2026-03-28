'use client'

import * as React from 'react'
import { getSessionCookie } from '@/lib/auth/session'
import type { RosterEntry, AttendanceStatus } from '@/types/attendance'
import { STATUS_LABELS } from '@/lib/attendance'
import AttendanceWorkerRow, { type DraftRecord } from './AttendanceWorkerRow'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

interface Props {
  jobId: string
  locale: string
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function formatDateKo(date: Date): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const w = WEEKDAY_LABELS[date.getDay()]
  return `${y}년 ${m}월 ${d}일 (${w})`
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
          throw new Error(body.message ?? '출근부를 불러올 수 없습니다')
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
        throw new Error(body.message ?? '저장에 실패했습니다')
      }
      // Mark as clean and update savedDrafts
      setDrafts(prev => prev.map(d => d.workerId === workerId ? { ...d, isDirty: false } : d))
      setSavedDrafts(prev => prev.map(d => d.workerId === workerId ? { ...draft, isDirty: false } : d))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장에 실패했습니다')
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
        throw new Error(body.message ?? '저장에 실패했습니다')
      }
      setDrafts(prev => prev.map(d => ({ ...d, isDirty: false })))
      setSavedDrafts(drafts.map(d => ({ ...d, isDirty: false })))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장에 실패했습니다')
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
              className="p-1.5 rounded-2xl border border-[#EFF1F5] hover:border-gray-400 transition-colors"
              aria-label="전날"
            >
              <svg className="w-4 h-4 text-[#25282A]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <polyline points="10,3 5,8 10,13" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-[#25282A] min-w-[160px] text-center">
              {formatDateKo(selectedDate)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              className="p-1.5 rounded-2xl border border-[#EFF1F5] hover:border-gray-400 transition-colors"
              aria-label="다음날"
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
            오늘
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
                {totalWorkers}명 출근 예정 · {attendedCount}명 출근 확인됨
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: '출근', count: attendedCount, cls: 'bg-green-50 text-green-700 border-green-200' },
                  { label: '반차', count: halfDayCount, cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                  { label: '결근', count: absentCount, cls: 'bg-red-50 text-[#D81A48] border-red-200' },
                  { label: '미확인', count: pendingCount, cls: 'bg-gray-100 text-[#98A2B2] border-[#EFF1F5]' },
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
              전체 출근
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={isSavingAll || dirtyCount === 0}
              className="px-4 py-1.5 rounded-2xl bg-[#0669F7] text-white text-xs font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              {isSavingAll ? '저장 중...' : '일괄 저장'}
            </button>
            {dirtyCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                {dirtyCount}명 미저장
              </span>
            )}
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <p className="text-xs text-[#D81A48]">{saveError}</p>
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
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full w-16" />
                </div>
              </div>
            ))}
          </>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-[#D81A48] text-sm mb-3">{error}</p>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date(selectedDate))}
              className="px-4 py-2 rounded-2xl border border-[#EFF1F5] text-sm text-[#25282A] hover:border-[#0669F7] transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : drafts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#98A2B2] text-sm font-medium">출근 예정 근로자가 없습니다</p>
            <p className="text-[#98A2B2] text-xs mt-1">이 날짜에 배정된 근로자가 없습니다</p>
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
