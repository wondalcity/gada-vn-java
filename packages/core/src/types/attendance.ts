export type AttendanceStatus = 'ATTENDED' | 'ABSENT' | 'HALF_DAY' | 'PENDING';

export interface AttendanceRecord {
  id: string;
  jobId: string;
  workerId: string;
  contractId: string | null;
  workDate: Date;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  hoursWorked: number | null;
  markedBy: string | null;
  markedAt: Date | null;
  notes: string | null;
}

export interface AttendanceBulkUpdate {
  records: Array<{
    workerId: string;
    status: AttendanceStatus;
    checkInTime?: string;
    checkOutTime?: string;
    hoursWorked?: number;
    notes?: string;
  }>;
}
