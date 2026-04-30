import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AttendanceRepository, AttendanceStatus } from './attendance.repository';
import { NotificationsService } from '../notifications/notifications.service';

// 상태 흐름: PENDING → PRE_CONFIRMED → COMMUTING → WORK_STARTED → WORK_COMPLETED → ATTENDED/EARLY_LEAVE/ABSENT
const WORKER_STATUS_LABELS: Record<string, string> = {
  PRE_CONFIRMED: '출근 예정 확인',
  COMMUTING: '출근 중',
  WORK_STARTED: '작업 시작',
  WORK_COMPLETED: '작업 마감',
  ATTENDED: '출근 확인',
  ABSENT: '결근 처리',
  EARLY_LEAVE: '조퇴 처리',
};

@Injectable()
export class AttendanceService {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async findByJob(jobId: string, managerUserId: string) {
    return this.repo.findByJobId(jobId, managerUserId);
  }

  async getHistory(id: string) {
    return this.repo.findHistory(id);
  }

  async updateManagerStatus(
    id: string,
    managerUserId: string,
    data: { status: string; notes?: string },
  ) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`Attendance record ${id} not found`);

    const updated = await this.repo.updateManagerStatus(id, managerUserId, data);
    if (!updated) throw new ForbiddenException('Not authorized or record not found');

    const workerUserId = await this.repo.findWorkerUserIdByRecord(id);
    if (workerUserId) {
      const label = WORKER_STATUS_LABELS[data.status] ?? '출결 업데이트';
      this.notifications.send(
        workerUserId,
        'ATTENDANCE_MARKED',
        `출역 현황 업데이트: ${label}`,
        `${new Date().toLocaleDateString('ko-KR')} 출역 현황이 업데이트되었습니다.`,
        { attendanceId: id, status: data.status },
      ).catch(() => undefined);
    }

    return updated;
  }

  async bulkUpsert(
    jobId: string,
    managerUserId: string,
    records: Array<{ workerId: string; workDate: string; status: string; notes?: string }>,
  ) {
    return this.repo.bulkUpsert(jobId, managerUserId, records);
  }

  async setWorkerStatus(
    id: string,
    workerUserId: string,
    status: AttendanceStatus,
  ) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`Attendance record ${id} not found`);

    // Verify record belongs to this worker & get profile info
    const { rows } = await (this.repo as any).db.query(
      `SELECT wp.id AS worker_profile_id, wp.full_name
       FROM app.attendance_records ar
       JOIN app.worker_profiles wp ON ar.worker_id = wp.id
       JOIN app.users u ON wp.user_id = u.id
       WHERE ar.id = $1 AND u.id = $2`,
      [id, workerUserId],
    );
    if (rows.length === 0) {
      throw new ForbiddenException('Not authorized to update this attendance record');
    }

    const { worker_profile_id, full_name } = rows[0] as { worker_profile_id: string; full_name: string };
    return this.repo.updateWorkerStatus(id, worker_profile_id, full_name || 'Worker', status);
  }

  async setWorkDuration(
    id: string,
    userId: string,
    role: string,
    hours: number,
    minutes: number,
  ) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`Attendance record ${id} not found`);

    const setBy = role === 'MANAGER' ? 'MANAGER' : 'WORKER';

    if (setBy === 'WORKER') {
      const ownerUserId = await this.repo.findWorkerUserIdByRecord(id);
      if (ownerUserId !== userId) {
        throw new ForbiddenException('Not authorized to update this attendance record');
      }
    }

    return this.repo.setWorkDuration(id, hours, minutes, setBy);
  }

  async confirmWorkDuration(id: string, userId: string) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`Attendance record ${id} not found`);

    const ownerUserId = await this.repo.findWorkerUserIdByRecord(id);
    const isOwner = ownerUserId === userId;
    if (!isOwner) {
      const isManager = await this.repo.isManagerOfRecord(id, userId);
      if (!isManager) throw new ForbiddenException('Not authorized to confirm this record');
    }

    return this.repo.confirmWorkDuration(id);
  }

  // ── Admin methods ─────────────────────────────────────────────────────────

  async adminList(filters: {
    jobId?: string;
    workDate?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    return this.repo.adminList(filters);
  }

  async adminUpdate(id: string, data: {
    status?: string;
    workerStatus?: string;
    workHours?: number;
    workMinutes?: number;
    workDurationConfirmed?: boolean;
    notes?: string;
  }) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`Attendance record ${id} not found`);
    return this.repo.adminUpdate(id, data);
  }
}
