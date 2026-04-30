export type AttendanceStatus =
  | 'PENDING'
  | 'PRE_CONFIRMED'
  | 'COMMUTING'
  | 'WORK_STARTED'
  | 'WORK_COMPLETED'
  | 'ATTENDED'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'EARLY_LEAVE'

export interface StatusHistoryEntry {
  id: string
  changedByRole: 'WORKER' | 'MANAGER' | 'SYSTEM'
  changedByName: string | null
  oldStatus: AttendanceStatus | null
  newStatus: AttendanceStatus
  changedAt: string
  note: string | null
}

export interface AttendanceRecord {
  id: string
  status: AttendanceStatus
  workerStatus?: AttendanceStatus | null
  updatedByRole?: 'WORKER' | 'MANAGER' | 'SYSTEM' | null
  workHours?: number | null
  workMinutes?: number | null
  workDurationSetBy?: 'WORKER' | 'MANAGER' | null
  workDurationConfirmed?: boolean
  markedAt?: string
  notes?: string
}

export interface RosterEntry {
  applicationId?: string
  workerId: string
  workerName: string
  workerPhone?: string
  tradeNameKo?: string
  experienceMonths: number
  attendance: AttendanceRecord | null
}

export interface AttendanceAuditEntry {
  id: string
  attendanceId: string
  changedByRole: 'WORKER' | 'MANAGER' | 'SYSTEM'
  changedByName: string | null
  oldStatus: AttendanceStatus | null
  newStatus: AttendanceStatus
  changedAt: string
  note: string | null
}

export interface WorkerAttendanceRecord {
  id: string
  jobId: string
  jobTitle?: string
  siteName?: string
  workDate: string
  dailyWage?: number
  workStartTime?: string
  // Unified status (whoever updated first)
  status: AttendanceStatus
  updatedByRole?: 'WORKER' | 'MANAGER' | 'SYSTEM' | null
  lastUpdatedAt?: string
  // Manager status
  managerStatus?: AttendanceStatus
  // Worker self-reported status
  workerStatus?: AttendanceStatus | null
  workerStatusAt?: string | null
  // Work duration
  workHours?: number | null
  workMinutes?: number | null
  workDurationSetBy?: 'WORKER' | 'MANAGER' | null
  workDurationConfirmed?: boolean
  workDurationConfirmedAt?: string | null
  notes?: string
  // History
  statusHistory?: StatusHistoryEntry[]
}
