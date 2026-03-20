import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ContractsRepository } from './contracts.repository';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ContractsService {
  constructor(
    private readonly repo: ContractsRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async generate(managerUserId: string, applicationId: string) {
    const application = await this.repo.findAcceptedApplication(applicationId, managerUserId);
    if (!application) {
      throw new NotFoundException('Application not found or unauthorized');
    }

    const contractHtml = `<html><body>
      <h1>근로계약서</h1>
      <p>일자리: ${application.job_title}</p>
      <p>근무일: ${application.work_date}</p>
      <p>일당: ${application.daily_wage} VND</p>
      <p>근로자: ${application.worker_name}</p>
    </body></html>`;

    const contract = await this.repo.create({
      applicationId,
      jobId: application.job_id as string,
      workerId: application.worker_id as string,
      managerId: application.manager_profile_id as string,
      contractHtml,
    });

    // Notify worker that contract is ready to sign
    const parties = await this.repo.findPartyUserIds(contract.id);
    if (parties.workerUserId) {
      this.notifications.send(
        parties.workerUserId,
        'CONTRACT_READY',
        '계약서가 발행되었습니다 📄',
        '계약서를 확인하고 서명해 주세요.',
        { contractId: contract.id },
      ).catch(() => undefined);
    }

    return contract;
  }

  async findById(id: string, userId: string) {
    const contract = await this.repo.findById(id);
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);

    const isParty = await this.repo.isUserPartyToContract(id, userId);
    if (!isParty) throw new ForbiddenException('Access denied');

    return contract;
  }

  async sign(id: string, workerUserId: string, signatureData?: string) {
    const contract = await this.repo.findById(id);
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);

    const isWorker = await this.repo.isWorkerPartyToContract(id, workerUserId);
    if (!isWorker) throw new ForbiddenException('Not authorized to sign this contract');

    const signed = await this.repo.sign(id, workerUserId, signatureData ?? '');

    // Notify manager that worker has signed
    const parties = await this.repo.findPartyUserIds(id);
    if (parties.managerUserId) {
      this.notifications.send(
        parties.managerUserId,
        'CONTRACT_SIGNED',
        '근로자가 계약서에 서명했습니다 ✅',
        '계약이 완료되었습니다. 계약서를 확인해 주세요.',
        { contractId: id },
      ).catch(() => undefined);
    }

    return signed;
  }
}
