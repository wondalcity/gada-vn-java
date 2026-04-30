import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

interface AttendanceRecord {
  id: string
  worker_name: string
  job_title: string
  site_name: string
  manager_company: string
  work_date: string
  // Manager status
  status: string
  manager_status_at: string | null
  // Worker self-reported
  worker_status: string | null
  worker_status_at: string | null
  // Duration
  work_hours: number | null
  work_minutes: number | null
  work_duration_set_by: string | null
  work_duration_confirmed: boolean
  notes: string | null
}

const STATUS_COLORS: Record<string, string> = {
  ATTENDED:    'bg-green-100 text-green-700',
  ABSENT:      'bg-red-100 text-red-700',
  EARLY_LEAVE: 'bg-orange-100 text-orange-700',
  PENDING:     'bg-blue-100 text-blue-700',
}

const STATUS_LABELS: Record<string, string> = {
  ATTENDED:    '출근',
  ABSENT:      '결근',
  EARLY_LEAVE: '조퇴',
  PENDING:     '미확정',
}

function formatDuration(hours: number | null, minutes: number | null): string {
  if (hours == null) return '-'
  const m = minutes ?? 0
  return m === 0 ? `${hours}시간` : `${hours}시간 ${m}분`
}

function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-xs text-gray-400">-</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[value] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABELS[value] ?? value}
    </span>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditModal({
  record,
  onClose,
  onSaved,
}: {
  record: AttendanceRecord
  onClose: () => void
  onSaved: (updated: AttendanceRecord) => void
}) {
  const [managerStatus, setManagerStatus] = useState(record.status)
  const [workerStatus, setWorkerStatus] = useState(record.worker_status ?? '')
  const [workHours, setWorkHours] = useState(record.work_hours ?? 0)
  const [workMinutes, setWorkMinutes] = useState(record.work_minutes ?? 0)
  const [confirmed, setConfirmed] = useState(record.work_duration_confirmed)
  const [notes, setNotes] = useState(record.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const STATUS_OPTIONS = ['ATTENDED', 'ABSENT', 'EARLY_LEAVE', 'PENDING']

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const body: Record<string, unknown> = {
        status: managerStatus,
        notes: notes || undefined,
      }
      if (workerStatus) body.workerStatus = workerStatus
      if (workHours > 0 || workMinutes > 0) {
        body.workHours = workHours
        body.workMinutes = workMinutes
      }
      body.workDurationConfirmed = confirmed

      const updated = await api.put<AttendanceRecord>(`/admin/attendance/${record.id}`, body)
      onSaved(updated)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900">출퇴근 기록 수정</h3>
        <div className="text-sm text-gray-500">
          {record.worker_name} · {record.job_title} · {new Date(record.work_date).toLocaleDateString('ko-KR')}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

        <div className="space-y-3">
          {/* Manager status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">관리자 상태</label>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setManagerStatus(opt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    managerStatus === opt
                      ? `${STATUS_COLORS[opt]} border-transparent`
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {STATUS_LABELS[opt]}
                </button>
              ))}
            </div>
          </div>

          {/* Worker status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">근로자 상태</label>
            <div className="flex gap-2 flex-wrap">
              {['ATTENDED', 'ABSENT', 'EARLY_LEAVE'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setWorkerStatus(workerStatus === opt ? '' : opt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    workerStatus === opt
                      ? `${STATUS_COLORS[opt]} border-transparent`
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {STATUS_LABELS[opt]}
                </button>
              ))}
            </div>
          </div>

          {/* Work duration */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">근무 시간</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <select
                  value={workHours}
                  onChange={e => setWorkHours(Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                >
                  {Array.from({ length: 25 }, (_, i) => i).map(h => (
                    <option key={h} value={h}>{h}시간</option>
                  ))}
                </select>
                <select
                  value={workMinutes}
                  onChange={e => setWorkMinutes(Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                확정
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">메모</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="비고 입력"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]/20 focus:border-[#0669F7]"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-2 px-6 py-2.5 rounded-2xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4] disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Attendance() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') ?? ''
  const dateFilter = searchParams.get('date') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20

  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null)

  const STATUS_TABS = [
    { key: '', label: '전체' },
    { key: 'ATTENDED', label: '출근' },
    { key: 'ABSENT', label: '결근' },
    { key: 'EARLY_LEAVE', label: '조퇴' },
    { key: 'PENDING', label: '미확정' },
  ]

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (dateFilter) params.set('workDate', dateFilter)
    params.set('page', String(page))
    params.set('limit', String(limit))

    api.get<{ data: AttendanceRecord[]; total: number }>(`/admin/attendance?${params}`)
      .then(res => {
        setRecords(res.data ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(() => { setRecords([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [statusFilter, dateFilter, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">출퇴근 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">근로자 출퇴근 현황 조회 및 수정</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#EFF1F5] p-4 space-y-3">
        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSearchParams({ status: tab.key, date: dateFilter, page: '1' })}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-[#0669F7] text-white'
                  : 'bg-[#F2F4F5] text-gray-600 hover:bg-[#EFF1F5]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500 font-medium">날짜</label>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setSearchParams({ status: statusFilter, date: e.target.value, page: '1' })}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]/20 focus:border-[#0669F7]"
          />
          {dateFilter && (
            <button
              onClick={() => setSearchParams({ status: statusFilter, date: '', page: '1' })}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              초기화
            </button>
          )}
          <span className="text-sm text-gray-400 ml-auto">총 {total}건</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EFF1F5] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#0669F7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">출퇴근 기록이 없습니다</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F2F4F5] border-b border-[#EFF1F5]">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">근로자</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">일자리</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">출역일</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">관리자 상태</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">근로자 상태</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">근무 시간</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">확정</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {records.map(rec => (
                <tr key={rec.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{rec.worker_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{rec.manager_company}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-gray-700 font-medium">{rec.job_title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{rec.site_name}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                    {new Date(rec.work_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge value={rec.status} />
                    {rec.manager_status_at && rec.status !== 'PENDING' && (
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(rec.manager_status_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge value={rec.worker_status} />
                    {rec.worker_status_at && rec.worker_status && (
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(rec.worker_status_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700 font-medium">
                    {formatDuration(rec.work_hours, rec.work_minutes)}
                    {rec.work_duration_set_by && (
                      <div className="text-[11px] text-gray-400">
                        ({rec.work_duration_set_by === 'WORKER' ? '근로자' : '관리자'})
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {rec.work_hours != null ? (
                      rec.work_duration_confirmed
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">확정</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">미확정</span>
                    ) : <span className="text-xs text-gray-300">-</span>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setEditRecord(rec)}
                      className="text-xs text-[#0669F7] hover:text-[#0550C4] font-medium"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#EFF1F5]">
            <button
              disabled={page <= 1}
              onClick={() => setSearchParams({ status: statusFilter, date: dateFilter, page: String(page - 1) })}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-[#F2F4F5] rounded-xl hover:bg-[#EFF1F5] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-sm text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setSearchParams({ status: statusFilter, date: dateFilter, page: String(page + 1) })}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-[#F2F4F5] rounded-xl hover:bg-[#EFF1F5] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editRecord && (
        <EditModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSaved={updated => {
            setRecords(prev => prev.map(r => r.id === updated.id ? updated : r))
            setEditRecord(null)
          }}
        />
      )}
    </div>
  )
}
