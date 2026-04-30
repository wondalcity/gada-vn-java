'use client'

import * as React from 'react'
import type { AttendanceStatus } from '@/types/attendance'
import { STATUS_LABELS, STATUS_COLORS, formatHoursWorked } from '@/lib/attendance'
import AttendanceStatusPicker from '@/components/attendance/AttendanceStatusPicker'
import TimeEntry from '@/components/attendance/TimeEntry'
import AttendanceAuditList from './AttendanceAuditList'

export interface DraftRecord {
  workerId: string
  workerName: string
  workerPhone?: string
  tradeNameKo?: string
  experienceMonths: number
  attendanceId?: string
  status: AttendanceStatus
  checkInTime: string
  checkOutTime: string
  hoursWorked: number | null
  notes: string
  isDirty: boolean
  // New fields from API
  workerStatus?: string | null
  updatedByRole?: string | null
  workHours?: number | null
  workMinutes?: number | null
  workDurationSetBy?: string | null
  workDurationConfirmed?: boolean
}

interface Props {
  draft: DraftRecord
  onChange: (partial: Partial<DraftRecord>) => void
  onSaveRow: () => Promise<void>
  isSaving: boolean
  jobId: string
  idToken: string
  savedDraft: DraftRecord
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return name.slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function RoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = { WORKER: '근로자', MANAGER: '관리자', SYSTEM: '시스템' }
  const colors: Record<string, string> = {
    WORKER: 'bg-[#E3F2FD] text-[#1565C0]',
    MANAGER: 'bg-[#E8F5E9] text-[#2E7D32]',
    SYSTEM: 'bg-[#EFF1F5] text-[#7A7B7A]',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[role] ?? 'bg-[#EFF1F5] text-[#7A7B7A]'}`}>
      {labels[role] ?? role}
    </span>
  )
}

export default function AttendanceWorkerRow({
  draft,
  onChange,
  onSaveRow,
  isSaving,
  jobId,
  idToken,
  savedDraft,
}: Props) {
  const [isExpanded, setIsExpanded] = React.useState(draft.status === 'PENDING')
  const [showAudit, setShowAudit] = React.useState(false)

  const hasWorkerStatus =
    draft.workerStatus != null &&
    draft.workerStatus !== '' &&
    draft.workerStatus !== draft.status

  function handleRevert() {
    onChange({
      status: savedDraft.status,
      checkInTime: savedDraft.checkInTime,
      checkOutTime: savedDraft.checkOutTime,
      hoursWorked: savedDraft.hoursWorked,
      notes: savedDraft.notes,
      isDirty: false,
    })
  }

  async function handleSave() {
    await onSaveRow()
    setIsExpanded(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] overflow-hidden">
      {/* Row header */}
      <button
        type="button"
        onClick={() => setIsExpanded(e => !e)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#F2F4F5] transition-colors"
        aria-expanded={isExpanded}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#0669F7] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
          {getInitials(draft.workerName)}
        </div>

        {/* Worker info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-[#25282A] text-sm truncate">{draft.workerName}</p>
            {draft.isDirty && (
              <span className="w-2 h-2 rounded-full bg-[#FFC72C] flex-shrink-0" title="미저장 변경사항" />
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <p className="text-xs text-[#98A2B2] truncate">
              {draft.tradeNameKo ?? '직종 미지정'}
              {' · '}
              {draft.experienceMonths >= 12
                ? `${Math.floor(draft.experienceMonths / 12)}년 ${draft.experienceMonths % 12}개월`
                : `${draft.experienceMonths}개월`} 경력
            </p>
            {/* Worker-reported status pill (different from manager status) */}
            {hasWorkerStatus && (
              <span className={[
                'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border',
                STATUS_COLORS[draft.workerStatus!] ?? 'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]',
              ].join(' ')}>
                자가: {STATUS_LABELS[draft.workerStatus!] ?? draft.workerStatus}
              </span>
            )}
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex flex-col items-end gap-1">
            <span
              className={[
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                STATUS_COLORS[draft.status],
              ].join(' ')}
            >
              {STATUS_LABELS[draft.status]}
            </span>
            {draft.updatedByRole && (
              <RoleBadge role={draft.updatedByRole} />
            )}
          </div>

          {/* Expand icon */}
          <svg
            className={`w-4 h-4 text-[#98A2B2] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <polyline points="3,6 8,11 13,6" />
          </svg>
        </div>
      </button>

      {/* Expanded content — animated */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.22s ease',
        }}
        aria-hidden={!isExpanded}
      >
      <div style={{ overflow: 'hidden' }}>
        <div className="px-4 pb-4 border-t border-[#EFF1F5] space-y-4">
          {/* Worker status info row */}
          {(hasWorkerStatus || draft.workHours != null || draft.workMinutes != null) && (
            <div className="pt-3 p-3 bg-[#FAFAFA] rounded-xl border border-[#EFF1F5] space-y-2">
              {hasWorkerStatus && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#98A2B2]">근로자 자가 입력:</span>
                  <span className={[
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                    STATUS_COLORS[draft.workerStatus!] ?? 'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]',
                  ].join(' ')}>
                    {STATUS_LABELS[draft.workerStatus!] ?? draft.workerStatus}
                  </span>
                </div>
              )}
              {(draft.workHours != null || draft.workMinutes != null) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#98A2B2]">근무 시간:</span>
                  <span className="text-xs font-medium text-[#25282A]">
                    {formatHoursWorked(draft.workHours, draft.workMinutes)}
                  </span>
                  {draft.workDurationSetBy && (
                    <RoleBadge role={draft.workDurationSetBy} />
                  )}
                  {draft.workDurationConfirmed ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E6F9E6] text-[#1A6B1A]">확정</span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EFF1F5] text-[#7A7B7A]">미확정</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status picker */}
          <div className={hasWorkerStatus || draft.workHours != null ? '' : 'pt-3'}>
            <p className="text-xs font-medium text-[#98A2B2] mb-2">출근 상태</p>
            <AttendanceStatusPicker
              value={draft.status}
              onChange={status => onChange({ status, isDirty: true })}
              disabled={isSaving}
            />
          </div>

          {/* Time entry — only for ATTENDED / HALF_DAY */}
          {(draft.status === 'ATTENDED' || draft.status === 'HALF_DAY') && (
            <div>
              <p className="text-xs font-medium text-[#98A2B2] mb-2">근무 시간</p>
              <TimeEntry
                checkIn={draft.checkInTime}
                checkOut={draft.checkOutTime}
                onChangeCheckIn={v => onChange({ checkInTime: v, isDirty: true })}
                onChangeCheckOut={v => onChange({ checkOutTime: v, isDirty: true })}
                hoursWorked={draft.hoursWorked}
                onChangeHours={v => onChange({ hoursWorked: v, isDirty: true })}
                status={draft.status}
                disabled={isSaving}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-[#98A2B2] mb-1">메모</p>
            <textarea
              rows={2}
              maxLength={500}
              value={draft.notes}
              onChange={e => onChange({ notes: e.target.value, isDirty: true })}
              disabled={isSaving}
              placeholder="메모를 입력하세요 (선택)"
              className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm resize-none disabled:opacity-50"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !draft.isDirty}
              className="px-4 py-2 rounded-2xl bg-[#0669F7] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#0557D4] transition-colors"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>

            {draft.isDirty && (
              <button
                type="button"
                onClick={handleRevert}
                disabled={isSaving}
                className="px-4 py-2 rounded-2xl border border-[#EFF1F5] text-[#98A2B2] text-sm font-medium hover:border-[#DDDDDD] transition-colors disabled:opacity-50"
              >
                취소
              </button>
            )}

            {/* Audit history */}
            {draft.attendanceId && (
              <button
                type="button"
                onClick={() => setShowAudit(a => !a)}
                className="ml-auto text-xs text-[#0669F7] underline"
              >
                {showAudit ? '이력 닫기' : '변경이력 보기'}
              </button>
            )}
          </div>

          {/* Audit list */}
          {showAudit && draft.attendanceId && (
            <div className="border-t border-[#EFF1F5] pt-3">
              <p className="text-xs font-medium text-[#98A2B2] mb-1">변경 이력</p>
              <AttendanceAuditList
                attendanceId={draft.attendanceId}
                jobId={jobId}
                idToken={idToken}
              />
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
