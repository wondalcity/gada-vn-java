import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository';

@Injectable()
export class AttendanceService {
  constructor(private readonly repo: AttendanceRepository) {}

  async findByJob(jobId: string, managerUserId: string) {
    return this.repo.findByJobId(jobId, managerUserId);
  }

  async update(
    id: string,
    managerUserId: string,
    data: { status: string; note?: string },
  ) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`Attendance record ${id} not found`);
    return this.repo.update(id, managerUserId, data);
  }

  async bulkUpsert(
    jobId: string,
    managerUserId: string,
    records: Array<{ workerId: string; status: string; note?: string }>,
  ) {
    return this.repo.bulkUpsert(jobId, managerUserId, records);
  }
}
