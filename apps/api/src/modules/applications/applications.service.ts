import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ApplicationsRepository } from './applications.repository';

@Injectable()
export class ApplicationsService {
  constructor(private readonly repo: ApplicationsRepository) {}

  async apply(userId: string, jobId: string, data: Record<string, unknown>) {
    const existing = await this.repo.findByWorkerAndJob(userId, jobId);
    if (existing) {
      throw new ConflictException('Already applied to this job');
    }
    return this.repo.create(userId, jobId, data);
  }

  async findByWorker(userId: string, page: number, limit: number) {
    return this.repo.findByWorkerUserId(userId, page, limit);
  }

  async findByJob(jobId: string, managerUserId: string) {
    return this.repo.findByJobId(jobId, managerUserId);
  }

  async updateStatus(id: string, managerUserId: string, status: string) {
    const application = await this.repo.findById(id);
    if (!application) throw new NotFoundException(`Application ${id} not found`);
    return this.repo.updateStatus(id, managerUserId, status);
  }
}
