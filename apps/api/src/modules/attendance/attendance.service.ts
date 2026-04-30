import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async findByJob(jobId: string, managerUserId: string) {
    return this.repo.findByJobId(jobId, managerUserId);
  }

  async updateManagerStatus(
    id: string,
    managerUserId: string,
    data: { status: string; notes?: string },
  ) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`Attendance record ${id} not found`);

    const updated = await this.repo.updateManagerStatus(id, managerUserId, data);

    const workerUserId = await this.repo.findWorkerUserIdByRecord(id);
    if (workerUserId) {
      const statusLabel = data.status === 'ATTENDED' ? '출근 확인'
        : data.status === 'ABSENT' ? '결근 처리'
        : data.status === 'EARLY_LEAVE' ? '조퇴 처리'
        : '출결 업데이트';
      this.notifications.send(
        workerUserId,
        'ATTENDANCE_MARKED',
        `출역 현황 업데이트: ${statusLabel}`,
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
    status: 'ATTENDED' | 'ABSENT' | 'EARLY_LEAVE',
  ) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`Attendance record ${id} not found`);

    // Verify the record belongs to this worker
    const ownerUserId = await this.repo.findWorkerUserIdByRecord(id);
    if (ownerUserId !== workerUserId) {
      throw new ForbiddenException('Not authorized to update this attendance record');
    }

    return this.repo.updateWorkerStatus(id, status);
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

    // Workers can only set duration on their own record
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

    // Either the worker who owns this record or the manager of the job can confirm
    const ownerUserId = await this.repo.findWorkerUserIdByRecord(id);
    const isOwner = ownerUserId === userId;
    if (!isOwner) {
      // Check if userId is the manager of the job
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
