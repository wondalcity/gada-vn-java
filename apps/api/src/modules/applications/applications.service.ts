import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ApplicationsRepository } from './applications.repository';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly repo: ApplicationsRepository,
    private readonly notifications: NotificationsService,
  ) {}

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

    const updated = await this.repo.updateStatus(id, managerUserId, status);

    // Notify worker on status change
    if (status === 'ACCEPTED' || status === 'REJECTED') {
      const workerUserId = await this.repo.findWorkerUserIdByApplication(id);
      if (workerUserId) {
        const isAccepted = status === 'ACCEPTED';
        await this.notifications.send(
          workerUserId,
          isAccepted ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED',
          isAccepted ? '지원이 수락되었습니다 ✅' : '지원 결과 안내',
          isAccepted
            ? '축하합니다! 지원이 수락되었습니다. 계약서를 확인해 주세요.'
            : '아쉽게도 이번 일자리 지원이 수락되지 않았습니다.',
          { applicationId: id },
        ).catch(() => undefined); // fire-and-forget, non-fatal
      }
    }

    return updated;
  }
}
