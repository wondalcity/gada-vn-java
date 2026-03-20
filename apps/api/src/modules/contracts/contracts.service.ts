import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ContractsRepository } from './contracts.repository';

@Injectable()
export class ContractsService {
  constructor(private readonly repo: ContractsRepository) {}

  async generate(managerUserId: string, applicationId: string) {
    const application = await this.repo.findAcceptedApplication(applicationId, managerUserId);
    if (!application) {
      throw new NotFoundException('Application not found or unauthorized');
    }

    // Build simple HTML contract template
    const contractHtml = `<html><body>
      <h1>근로계약서</h1>
      <p>일자리: ${application.job_title}</p>
      <p>근무일: ${application.work_date}</p>
      <p>일당: ${application.daily_wage} VND</p>
      <p>근로자: ${application.worker_name}</p>
    </body></html>`;

    return this.repo.create({
      applicationId,
      jobId: application.job_id as string,
      workerId: application.worker_id as string,
      managerId: application.manager_profile_id as string,
      contractHtml,
    });
  }

  async findById(id: string, userId: string) {
    const contract = await this.repo.findById(id);
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);

    // Verify the requesting user is party to this contract
    const isParty = await this.repo.isUserPartyToContract(id, userId);
    if (!isParty) throw new ForbiddenException('Access denied');

    return contract;
  }

  async sign(id: string, workerUserId: string, signatureData?: string) {
    const contract = await this.repo.findById(id);
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);

    const isWorker = await this.repo.isWorkerPartyToContract(id, workerUserId);
    if (!isWorker) throw new ForbiddenException('Not authorized to sign this contract');

    return this.repo.sign(id, workerUserId, signatureData ?? '');
  }
}
