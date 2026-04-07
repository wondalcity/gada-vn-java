'use client'

import * as React from 'react'
import type { AttendanceStatus } from '@/types/attendance'
import { computeHours, formatHoursWorked } from '@/lib/attendance'

interface Props {
  checkIn: string
  checkOut: string
  onChangeCheckIn: (v: string) => void
  onChangeCheckOut: (v: string) => void
  hoursWorked: number | null
  onChangeHours: (v: number | null) => void
  status: AttendanceStatus
  disabled?: boolean
}

export default function TimeEntry({
  checkIn,
  checkOut,
  onChangeCheckIn,
  onChangeCheckOut,
  hoursWorked,
  onChangeHours,
  status,
  disabled,
}: Props) {
  const autoComputed = computeHours(checkIn, checkOut)
  const [manualOverride, setManualOverride] = React.useState(false)

  // When times change and auto-computed is valid, clear manual override
  React.useEffect(() => {
    if (autoComputed !== null && !manualOverride) {
      onChangeHours(autoComputed)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, checkOut])

  if (status !== 'ATTENDED' && status !== 'HALF_DAY') return null

  function handleManualHoursChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value === '' ? null : Number(e.target.value)
    setManualOverride(true)
    onChangeHours(val)
  }

  function handleCheckInChange(e: React.ChangeEvent<HTMLInputElement>) {
    setManualOverride(false)
    onChangeCheckIn(e.target.value)
  }

  function handleCheckOutChange(e: React.ChangeEvent<HTMLInputElement>) {
    setManualOverride(false)
    onChangeCheckOut(e.target.value)
  }

  const timeInputClass =
    'w-28 px-2 py-1.5 rounded-2xl border border-[#EFF1F5] text-sm focus:outline-none focus:border-[#0669F7] disabled:opacity-50'

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {/* Check-in */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-[#98A2B2] font-medium whitespace-nowrap">출근</label>
        <input
          type="time"
          value={checkIn}
          onChange={handleCheckInChange}
          disabled={disabled}
          className={timeInputClass}
        />
      </div>

      {/* Check-out */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-[#98A2B2] font-medium whitespace-nowrap">퇴근</label>
        <input
          type="time"
          value={checkOut}
          onChange={handleCheckOutChange}
          disabled={disabled}
          className={timeInputClass}
        />
      </div>

      {/* Hours worked */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-[#98A2B2] font-medium whitespace-nowrap">근무시간</label>
        {!manualOverride && autoComputed !== null ? (
          <div className="flex items-center gap-1">
            <span className="text-sm text-[#25282A] font-medium">{formatHoursWorked(autoComputed)}</span>
            <button
              type="button"
              onClick={() => setManualOverride(true)}
              className="text-xs text-[#0669F7] underline"
            >
              수동입력
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={hoursWorked ?? ''}
              onChange={handleManualHoursChange}
              disabled={disabled}
              placeholder="0"
              className="w-20 px-2 py-1.5 rounded-2xl border border-[#EFF1F5] text-sm focus:outline-none focus:border-[#0669F7] disabled:opacity-50"
            />
            <span className="text-xs text-[#98A2B2]">시간</span>
            {autoComputed !== null && (
              <button
                type="button"
                onClick={() => { setManualOverride(false); onChangeHours(autoComputed) }}
                className="text-xs text-[#98A2B2] underline"
              >
                자동
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
