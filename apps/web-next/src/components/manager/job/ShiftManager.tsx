'use client'

import * as React from 'react'
import { apiClient } from '@/lib/api/client'
import type { JobShift } from '@/types/manager-site-job'
import StatusBadge from '@/components/manager/StatusBadge'
import ConfirmModal from '@/components/manager/ConfirmModal'

interface ShiftManagerProps {
  jobId: string
  initialShifts: JobShift[]
  idToken: string
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(dateStr))
}

// Returns array of weekday dates (Mon-Sat) between start and end inclusive
function getWeekdays(startStr: string, endStr: string): string[] {
  const dates: string[] = []
  const current = new Date(startStr)
  const end = new Date(endStr)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0) {
      // exclude Sunday
      dates.push(current.toISOString().split('T')[0])
    }
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export default function ShiftManager({ jobId, initialShifts, idToken }: ShiftManagerProps) {
  const [shifts, setShifts] = React.useState<JobShift[]>(
    [...initialShifts].sort((a, b) => a.workDate.localeCompare(b.workDate))
  )

  const today = new Date().toISOString().split('T')[0]

  // Single date add
  const [showSingleAdd, setShowSingleAdd] = React.useState(false)
  const [singleDate, setSingleDate] = React.useState('')
  const [isAddingSingle, setIsAddingSingle] = React.useState(false)

  // Range add
  const [showRangeAdd, setShowRangeAdd] = React.useState(false)
  const [rangeFrom, setRangeFrom] = React.useState('')
  const [rangeTo, setRangeTo] = React.useState('')
  const [isAddingRange, setIsAddingRange] = React.useState(false)

  // Cancel
  const [cancelShiftId, setCancelShiftId] = React.useState<string | null>(null)
  const [isCancelling, setIsCancelling] = React.useState(false)

  const [error, setError] = React.useState<string | null>(null)

  async function handleAddSingle() {
    if (!singleDate) return
    setIsAddingSingle(true)
    setError(null)

    // Optimistic
    const tempId = `temp-${Date.now()}`
    const optimistic: JobShift = {
      id: tempId,
      jobId,
      workDate: singleDate,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    }
    setShifts((prev) =>
      [...prev, optimistic].sort((a, b) => a.workDate.localeCompare(b.workDate))
    )
    setShowSingleAdd(false)
    setSingleDate('')

    try {
      const res = await apiClient<JobShift>(`/manager/jobs/${jobId}/shifts`, {
        method: 'POST',
        token: idToken,
        body: JSON.stringify({ work_date: singleDate }),
      })
      setShifts((prev) =>
        prev.map((s) => (s.id === tempId ? res.data : s))
          .sort((a, b) => a.workDate.localeCompare(b.workDate))
      )
    } catch (e) {
      // Rollback
      setShifts((prev) => prev.filter((s) => s.id !== tempId))
      setError(e instanceof Error ? e.message : '날짜 추가 실패')
    } finally {
      setIsAddingSingle(false)
    }
  }

  async function handleAddRange() {
    if (!rangeFrom || !rangeTo) return
    const dates = getWeekdays(rangeFrom, rangeTo)
    if (dates.length === 0) { setError('선택 범위에 유효한 날짜가 없습니다 (일요일 제외)'); return }

    setIsAddingRange(true)
    setError(null)

    const tempShifts: JobShift[] = dates.map((d, i) => ({
      id: `temp-range-${Date.now()}-${i}`,
      jobId,
      workDate: d,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    }))
    setShifts((prev) =>
      [...prev, ...tempShifts].sort((a, b) => a.workDate.localeCompare(b.workDate))
    )
    setShowRangeAdd(false)
    setRangeFrom('')
    setRangeTo('')

    try {
      const res = await apiClient<JobShift[]>(`/manager/jobs/${jobId}/shifts`, {
        method: 'POST',
        token: idToken,
        body: JSON.stringify({ dates }),
      })
      const returned = Array.isArray(res.data) ? res.data : [res.data]
      const tempIds = new Set(tempShifts.map((t) => t.id))
      setShifts((prev) =>
        [...prev.filter((s) => !tempIds.has(s.id)), ...returned].sort(
          (a, b) => a.workDate.localeCompare(b.workDate)
        )
      )
    } catch (e) {
      const tempIds = new Set(tempShifts.map((t) => t.id))
      setShifts((prev) => prev.filter((s) => !tempIds.has(s.id)))
      setError(e instanceof Error ? e.message : '날짜 추가 실패')
    } finally {
      setIsAddingRange(false)
    }
  }

  async function handleCancelShift() {
    if (!cancelShiftId) return
    setIsCancelling(true)

    // Optimistic
    setShifts((prev) =>
      prev.map((s) => (s.id === cancelShiftId ? { ...s, status: 'CANCELLED' as const } : s))
    )
    const prevShifts = shifts

    try {
      await apiClient(`/manager/shifts/${cancelShiftId}/cancel`, {
        method: 'PATCH',
        token: idToken,
      })
    } catch (e) {
      // Rollback
      setShifts(prevShifts)
      setError(e instanceof Error ? e.message : '취소 실패')
    } finally {
      setIsCancelling(false)
      setCancelShiftId(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#25282A]">일정 관리</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowSingleAdd(!showSingleAdd); setShowRangeAdd(false) }}
            className="px-3 py-1.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-xs"
          >
            날짜 추가
          </button>
          <button
            type="button"
            onClick={() => { setShowRangeAdd(!showRangeAdd); setShowSingleAdd(false) }}
            className="px-3 py-1.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-xs"
          >
            기간으로 추가
          </button>
        </div>
      </div>

      {/* Single date add */}
      {showSingleAdd && (
        <div className="mb-4 p-3 bg-gray-50 rounded-2xl border border-[#EFF1F5] flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-[#25282A] mb-1">날짜 선택</label>
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              min={today}
              className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] bg-white"
            />
          </div>
          <button
            type="button"
            onClick={handleAddSingle}
            disabled={!singleDate || isAddingSingle}
            className="px-4 py-2 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40"
          >
            {isAddingSingle ? '추가 중...' : '추가'}
          </button>
          <button
            type="button"
            onClick={() => setShowSingleAdd(false)}
            className="px-4 py-2 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm"
          >
            취소
          </button>
        </div>
      )}

      {/* Range add */}
      {showRangeAdd && (
        <div className="mb-4 p-3 bg-gray-50 rounded-2xl border border-[#EFF1F5] space-y-2">
          <p className="text-xs text-[#98A2B2]">일요일을 제외한 평일+토요일이 추가됩니다</p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#25282A] mb-1">시작일</label>
              <input
                type="date"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                min={today}
                className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm bg-white"
              />
            </div>
            <span className="text-[#98A2B2] text-sm pb-2">~</span>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#25282A] mb-1">종료일</label>
              <input
                type="date"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                min={rangeFrom || today}
                className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm bg-white"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleAddRange}
              disabled={!rangeFrom || !rangeTo || isAddingRange}
              className="px-4 py-2 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40"
            >
              {isAddingRange ? '추가 중...' : '추가'}
            </button>
            <button
              type="button"
              onClick={() => setShowRangeAdd(false)}
              className="px-4 py-2 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-[#D81A48]">
          {error}
        </div>
      )}

      {/* Shift list */}
      {shifts.length === 0 ? (
        <p className="text-sm text-[#98A2B2] text-center py-6">등록된 일정이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="flex items-center justify-between py-2 border-b border-[#EFF1F5] last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#25282A]">{formatDate(shift.workDate)}</span>
                <StatusBadge status={shift.status} />
              </div>
              {shift.status === 'OPEN' && (
                <button
                  type="button"
                  onClick={() => setCancelShiftId(shift.id)}
                  className="text-xs text-[#D81A48] font-medium px-2 py-1 rounded-2xl hover:bg-red-50"
                >
                  취소
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={cancelShiftId !== null}
        title="일정 취소"
        message="이 날짜의 일정을 취소하시겠습니까?"
        confirmLabel="취소"
        confirmVariant="danger"
        onConfirm={handleCancelShift}
        onCancel={() => setCancelShiftId(null)}
        isLoading={isCancelling}
      />
    </div>
  )
}
