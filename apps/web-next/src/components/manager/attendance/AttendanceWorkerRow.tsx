'use client'

import * as React from 'react'
import type { AttendanceStatus } from '@/types/attendance'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/attendance'
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
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
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
              <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" title="미저장 변경사항" />
            )}
          </div>
          <p className="text-xs text-[#98A2B2] truncate">
            {draft.tradeNameKo ?? '직종 미지정'}
            {' · '}
            {draft.experienceMonths >= 12
              ? `${Math.floor(draft.experienceMonths / 12)}년 ${draft.experienceMonths % 12}개월`
              : `${draft.experienceMonths}개월`} 경력
          </p>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={[
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
              STATUS_COLORS[draft.status],
            ].join(' ')}
          >
            {STATUS_LABELS[draft.status]}
          </span>

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

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[#EFF1F5] space-y-4">
          {/* Status picker */}
          <div className="pt-3">
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
              className="px-4 py-2 rounded-2xl bg-[#0669F7] text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>

            {draft.isDirty && (
              <button
                type="button"
                onClick={handleRevert}
                disabled={isSaving}
                className="px-4 py-2 rounded-2xl border border-[#EFF1F5] text-[#98A2B2] text-sm font-medium hover:border-gray-400 transition-colors disabled:opacity-50"
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
      )}
    </div>
  )
}
