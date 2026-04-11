import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { DEMO_JOBS, DEMO_ROSTERS } from '../lib/demo-data'
import { useAdminTranslation } from '../context/LanguageContext'
import { fmtDate } from '../lib/dateUtils'

interface Job {
  id: string
  title: string
  site_name?: string
  address?: string
  province?: string
  work_date?: string
  start_time?: string
  end_time?: string
  daily_wage: number
  slots_total: number
  slots_filled: number
  status: string
  description?: string
  company_name?: string
}

interface RosterRow {
  application_id: string
  application_status: string
  worker_name: string
  worker_phone: string
  id_verified: boolean
  contract_id: string | null
  contract_status: string | null
  worker_signed_at: string | null
  manager_signed_at: string | null
  attendance_id: string | null
  attendance_status: string | null
  check_in_time: string | null
  check_out_time: string | null
  hours_worked: number | null
  attendance_notes: string | null
}

const APP_STATUS_BADGE: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  ACCEPTED:   'bg-blue-100 text-blue-700',
  CONTRACTED: 'bg-green-100 text-green-700',
  REJECTED:   'bg-[#FDE8EE] text-[#D81A48]',
  WITHDRAWN:  'bg-[#EFF1F5] text-[#98A2B2]',
}

const APP_STATUS_LABEL: Record<string, string> = {
  PENDING:    '검토중',
  ACCEPTED:   '합격',
  CONTRACTED: '계약완료',
  REJECTED:   '불합격',
  WITHDRAWN:  '취소',
}

const CONTRACT_STATUS_BADGE: Record<string, string> = {
  PENDING_WORKER_SIGN:  'bg-yellow-100 text-yellow-700',
  PENDING_MANAGER_SIGN: 'bg-orange-100 text-orange-700',
  FULLY_SIGNED:         'bg-green-100 text-green-700',
  VOID:                 'bg-[#EFF1F5] text-[#98A2B2]',
}

const CONTRACT_STATUS_LABEL: Record<string, string> = {
  PENDING_WORKER_SIGN:  '근로자 서명 대기',
  PENDING_MANAGER_SIGN: '관리자 서명 대기',
  FULLY_SIGNED:         '서명 완료',
  VOID:                 '무효',
}

const ATTENDANCE_STATUS_BADGE: Record<string, string> = {
  ATTENDED:  'bg-green-100 text-green-700',
  ABSENT:    'bg-[#FDE8EE] text-[#D81A48]',
  HALF_DAY:  'bg-orange-100 text-orange-700',
  PENDING:   'bg-[#EFF1F5] text-[#98A2B2]',
}

const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
  ATTENDED:  '출역',
  ABSENT:    '결근',
  HALF_DAY:  '반일',
  PENDING:   '미확인',
}

const JOB_STATUS_BADGE: Record<string, string> = {
  OPEN:      'bg-green-100 text-green-700',
  FILLED:    'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-[#EFF1F5] text-[#98A2B2]',
}

const JOB_STATUS_LABEL: Record<string, string> = {
  OPEN:      '모집 중',
  FILLED:    '마감',
  COMPLETED: '완료',
  CANCELLED: '취소됨',
}


// ── Reject notes modal ────────────────────────────────────────────────────
function RejectModal({
  workerName,
  onConfirm,
  onCancel,
}: {
  workerName: string
  onConfirm: (notes: string) => void
  onCancel: () => void
}) {
  const [notes, setNotes] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">불합격 처리</h3>
        <p className="text-sm text-[#98A2B2] mb-4">
          <span className="font-medium text-gray-700">{workerName}</span>님을 불합격 처리합니다.
          사유를 입력하면 기록에 남습니다 (선택).
        </p>
        <textarea
          ref={inputRef}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="불합격 사유 (선택)"
          className="w-full px-3 py-2.5 text-sm border border-[#EFF1F5] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[#D81A48] focus:border-transparent"
          rows={3}
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5] transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(notes)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#D81A48] text-white hover:bg-red-700 transition-colors"
          >
            불합격 처리
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Action buttons per row ────────────────────────────────────────────────
function ApplicationActions({
  row, isDemo, acting, onAccept, onReject, onReset,
}: {
  row: RosterRow
  isDemo: boolean
  acting: boolean
  onAccept: (id: string) => void
  onReject: (id: string, name: string) => void
  onReset: (id: string) => void
}) {
  const status = row.application_status
  if (status === 'CONTRACTED' || status === 'WITHDRAWN') {
    return <span className="text-xs text-[#98A2B2]">—</span>
  }

  const disabledClass = 'disabled:opacity-40 disabled:cursor-not-allowed'
  const disabled = acting || isDemo
  const title = isDemo ? '데모 모드에서는 변경 불가' : undefined

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {(status === 'PENDING' || status === 'REJECTED') && (
        <button
          disabled={disabled}
          onClick={() => onAccept(row.application_id)}
          title={title ?? '합격 처리'}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#E6F0FE] text-[#0669F7] border border-[#C8D8FF] hover:bg-[#0669F7] hover:text-white transition-colors whitespace-nowrap ${disabledClass}`}
        >
          {acting ? (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          합격
        </button>
      )}

      {(status === 'PENDING' || status === 'ACCEPTED') && (
        <button
          disabled={disabled}
          onClick={() => onReject(row.application_id, row.worker_name)}
          title={title ?? '불합격 처리'}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#FDE8EE] text-[#D81A48] border border-[#F4B0C0] hover:bg-[#D81A48] hover:text-white transition-colors whitespace-nowrap ${disabledClass}`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          불합격
        </button>
      )}

      {(status === 'ACCEPTED' || status === 'REJECTED') && (
        <button
          disabled={disabled}
          onClick={() => onReset(row.application_id)}
          title={title ?? '검토중으로 되돌리기'}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#EFF1F5] text-[#98A2B2] border border-[#EFF1F5] hover:bg-gray-200 hover:text-gray-700 transition-colors whitespace-nowrap ${disabledClass}`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          재검토
        </button>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function JobDetail() {
  const { locale } = useAdminTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [filter, setFilter] = useState<string>('ALL')
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<{ job: Job; roster: RosterRow[] }>(`/admin/jobs/${id}/roster`)
      .then((res) => {
        setJob(res.job)
        setRoster(res.roster ?? [])
        setIsDemo(false)
      })
      .catch(() => {
        const demoJob = DEMO_JOBS.find((j) => j.id === id)
        if (demoJob) {
          setJob(demoJob as unknown as Job)
          setRoster((DEMO_ROSTERS[id] ?? []) as unknown as RosterRow[])
          setIsDemo(true)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function patchRoster(applicationId: string, newStatus: string, notes?: string) {
    setRoster(prev => prev.map(r =>
      r.application_id === applicationId
        ? { ...r, application_status: newStatus, ...(notes !== undefined ? { attendance_notes: notes } : {}) }
        : r
    ))
  }

  async function handleAccept(applicationId: string) {
    const prev = roster.find(r => r.application_id === applicationId)?.application_status
    setActingId(applicationId)
    patchRoster(applicationId, 'ACCEPTED')
    try {
      await api.put(`/admin/applications/${applicationId}/accept`, {})
      showToast('합격 처리 완료', 'success')
    } catch (e: unknown) {
      if (prev) patchRoster(applicationId, prev)
      showToast((e as Error).message ?? '처리 실패', 'error')
    } finally {
      setActingId(null)
    }
  }

  async function handleRejectConfirm(notes: string) {
    if (!rejectTarget) return
    const { id: applicationId } = rejectTarget
    setRejectTarget(null)
    const prev = roster.find(r => r.application_id === applicationId)?.application_status
    setActingId(applicationId)
    patchRoster(applicationId, 'REJECTED', notes || undefined)
    try {
      await api.put(`/admin/applications/${applicationId}/reject`, { notes })
      showToast('불합격 처리 완료', 'success')
    } catch (e: unknown) {
      if (prev) patchRoster(applicationId, prev)
      showToast((e as Error).message ?? '처리 실패', 'error')
    } finally {
      setActingId(null)
    }
  }

  async function handleReset(applicationId: string) {
    const prev = roster.find(r => r.application_id === applicationId)?.application_status
    setActingId(applicationId)
    patchRoster(applicationId, 'PENDING')
    try {
      await api.put(`/admin/applications/${applicationId}/reset`, {})
      showToast('검토중으로 변경됨', 'success')
    } catch (e: unknown) {
      if (prev) patchRoster(applicationId, prev)
      showToast((e as Error).message ?? '처리 실패', 'error')
    } finally {
      setActingId(null)
    }
  }

  const FILTERS = [
    { key: 'ALL', label: '전체' },
    { key: 'ACCEPTED', label: '합격' },
    { key: 'CONTRACTED', label: '계약완료' },
    { key: 'PENDING', label: '검토중' },
    { key: 'REJECTED', label: '불합격' },
  ]

  const filtered = filter === 'ALL'
    ? roster
    : filter === 'ACCEPTED'
      ? roster.filter(r => r.application_status === 'ACCEPTED' || r.application_status === 'CONTRACTED')
      : roster.filter(r => r.application_status === filter)

  const stats = {
    total:      roster.length,
    pending:    roster.filter(r => r.application_status === 'PENDING').length,
    accepted:   roster.filter(r => r.application_status === 'ACCEPTED').length,
    contracted: roster.filter(r => r.application_status === 'CONTRACTED').length,
    attended:   roster.filter(r => r.attendance_status === 'ATTENDED').length,
    absent:     roster.filter(r => r.attendance_status === 'ABSENT').length,
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6 animate-pulse" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/jobs')} className="text-sm text-[#98A2B2] mb-4 hover:text-gray-700">← 일자리 목록으로</button>
        <p className="text-[#D81A48] text-sm">일자리 정보를 불러올 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          workerName={rejectTarget.name}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold shadow-lg whitespace-nowrap ${
          toast.type === 'success' ? 'bg-[#25282A] text-white' : 'bg-[#D81A48] text-white'
        }`}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* Back */}
      <button onClick={() => navigate('/jobs')} className="flex items-center gap-1 text-sm text-[#98A2B2] hover:text-gray-700 mb-5">
        ← 일자리 목록으로
      </button>

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">데모 데이터</span>
          <span className="text-amber-600">— 실제 API 연결 시 합격/불합격 처리가 가능합니다</span>
        </div>
      )}

      {/* Job header */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-6 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{job.title}</h1>
            <p className="text-sm text-[#98A2B2]">{job.site_name}{job.province ? ` · ${job.province}` : ''}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${JOB_STATUS_BADGE[job.status] ?? 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
              {JOB_STATUS_LABEL[job.status] ?? job.status}
            </span>
            <Link to={`/jobs/${job.id}/edit`} className="px-3 py-1.5 text-xs border border-[#EFF1F5] rounded-xl text-gray-600 hover:bg-[#F2F4F5]">수정</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-[#98A2B2] text-xs">근무일</span>
            <p className="font-medium text-gray-900 mt-0.5">{fmtDate(job.work_date, locale)}</p>
          </div>
          <div>
            <span className="text-[#98A2B2] text-xs">일 노임</span>
            <p className="font-medium text-[#0669F7] mt-0.5">₫{Number(job.daily_wage).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-[#98A2B2] text-xs">모집인원</span>
            <p className="font-medium text-gray-900 mt-0.5">{job.slots_filled ?? 0} / {job.slots_total}명</p>
          </div>
          {(job.start_time || job.end_time) && (
            <div>
              <span className="text-[#98A2B2] text-xs">근무시간</span>
              <p className="font-medium text-gray-900 mt-0.5">{job.start_time ?? '-'} ~ {job.end_time ?? '-'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
        {[
          { label: '총 지원', value: stats.total,      color: 'text-gray-900' },
          { label: '검토중', value: stats.pending,     color: 'text-yellow-600' },
          { label: '합격',   value: stats.accepted,    color: 'text-[#0669F7]' },
          { label: '계약',   value: stats.contracted,  color: 'text-green-600' },
          { label: '출역',   value: stats.attended,    color: 'text-green-700' },
          { label: '결근',   value: stats.absent,      color: 'text-[#D81A48]' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#EFF1F5] p-4 text-center">
            <p className="text-xs text-[#98A2B2] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => {
          const count = f.key === 'ALL' ? roster.length
            : f.key === 'ACCEPTED' ? roster.filter(r => r.application_status === 'ACCEPTED' || r.application_status === 'CONTRACTED').length
            : roster.filter(r => r.application_status === f.key).length
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-[#0669F7] text-white' : 'bg-white text-gray-600 border border-[#EFF1F5] hover:bg-[#F2F4F5]'
              }`}
            >
              {f.label} <span className="ml-1 opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Roster table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[#98A2B2]">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">해당하는 지원자가 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-[#F2F4F5]">
                <tr>
                  {['근로자', '연락처', '지원 상태', '처리', '계약서', '출결', '비고'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFF1F5]">
                {filtered.map((row) => (
                  <tr
                    key={row.application_id}
                    className={`transition-colors ${actingId === row.application_id ? 'bg-blue-50/60' : 'hover:bg-[#FAFAFA]'}`}
                  >
                    {/* 근로자 */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#0669F7] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {row.worker_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{row.worker_name}</p>
                          {row.id_verified && (
                            <span className="text-[10px] text-green-600 font-medium">✓ 신분증 인증</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 연락처 */}
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{row.worker_phone}</td>

                    {/* 지원 상태 뱃지 */}
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium whitespace-nowrap ${APP_STATUS_BADGE[row.application_status] ?? 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
                        {APP_STATUS_LABEL[row.application_status] ?? row.application_status}
                      </span>
                    </td>

                    {/* 어드민 액션 버튼 */}
                    <td className="px-5 py-4">
                      <ApplicationActions
                        row={row}
                        isDemo={isDemo}
                        acting={actingId === row.application_id}
                        onAccept={handleAccept}
                        onReject={(appId, name) => setRejectTarget({ id: appId, name })}
                        onReset={handleReset}
                      />
                    </td>

                    {/* 계약서 */}
                    <td className="px-5 py-4">
                      {row.contract_status ? (
                        <span className={`px-2.5 py-1 text-xs rounded-full font-medium whitespace-nowrap ${CONTRACT_STATUS_BADGE[row.contract_status] ?? 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
                          {CONTRACT_STATUS_LABEL[row.contract_status] ?? row.contract_status}
                        </span>
                      ) : (
                        <span className="text-xs text-[#98A2B2]">—</span>
                      )}
                    </td>

                    {/* 출결 */}
                    <td className="px-5 py-4">
                      {row.attendance_status ? (
                        <div>
                          <span className={`px-2.5 py-1 text-xs rounded-full font-medium whitespace-nowrap ${ATTENDANCE_STATUS_BADGE[row.attendance_status] ?? 'bg-[#EFF1F5] text-[#98A2B2]'}`}>
                            {ATTENDANCE_STATUS_LABEL[row.attendance_status] ?? row.attendance_status}
                          </span>
                          {row.check_in_time && (
                            <p className="text-[11px] text-[#98A2B2] mt-1">
                              {row.check_in_time}{row.check_out_time ? ` ~ ${row.check_out_time}` : ''}
                              {row.hours_worked ? ` (${row.hours_worked}h)` : ''}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[#98A2B2]">—</span>
                      )}
                    </td>

                    {/* 비고 */}
                    <td className="px-5 py-4 text-xs text-[#98A2B2] max-w-[160px]">
                      <p className="truncate">{row.attendance_notes ?? '—'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#98A2B2]">
        <span>• 합격 버튼: PENDING / REJECTED 상태에서 사용 가능</span>
        <span>• 불합격 버튼: PENDING / ACCEPTED 상태에서 사용 가능</span>
        <span>• 재검토 버튼: ACCEPTED / REJECTED → PENDING 으로 되돌리기</span>
        <span>• CONTRACTED(계약 생성 후)는 변경 불가</span>
      </div>
    </div>
  )
}
