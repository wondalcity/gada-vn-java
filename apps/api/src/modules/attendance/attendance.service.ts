import { Injectable, NotFoundException } from '@nestjs/common';
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

  async update(
    id: string,
    managerUserId: string,
    data: { status: string; notes?: string },
  ) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`Attendance record ${id} not found`);

    const updated = await this.repo.update(id, managerUserId, data);

    // Notify worker of attendance status
    const workerUserId = await this.repo.findWorkerUserIdByRecord(id);
    if (workerUserId) {
      const statusLabel = data.status === 'ATTENDED' ? '출근 확인' : '결근 처리';
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
}
