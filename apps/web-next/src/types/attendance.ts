export type AttendanceStatus = 'PENDING' | 'ATTENDED' | 'ABSENT' | 'HALF_DAY'

export interface AttendanceRecord {
  id: string
  status: AttendanceStatus
  checkInTime?: string    // "HH:MM"
  checkOutTime?: string   // "HH:MM"
  hoursWorked?: number
  markedAt?: string
  notes?: string
}

export interface RosterEntry {
  applicationId: string
  workerId: string
  workerName: string
  workerPhone?: string
  tradeNameKo?: string
  experienceMonths: number
  attendance: AttendanceRecord | null
}

export interface AttendanceAuditEntry {
  id: number
  attendanceId: string
  changedBy?: string
  changerName?: string
  changedAt: string
  oldStatus?: AttendanceStatus
  newStatus?: AttendanceStatus
  oldCheckIn?: string
  newCheckIn?: string
  oldCheckOut?: string
  newCheckOut?: string
  oldHours?: number
  newHours?: number
  oldNotes?: string
  newNotes?: string
  reason?: string
}

export interface WorkerAttendanceRecord {
  id: string
  jobId: string
  jobTitle?: string
  siteName?: string
  workDate: string
  status: AttendanceStatus
  checkInTime?: string
  checkOutTime?: string
  hoursWorked?: number
  notes?: string
  markedAt?: string
}
