import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ContractsRepository } from './contracts.repository';

@Injectable()
export class ContractsService {
  constructor(private readonly repo: ContractsRepository) {}

  async generate(managerUserId: string, applicationId: string) {
    // Verify manager owns the job application
    const application = await this.repo.findApplicationWithJob(applicationId, managerUserId);
    if (!application) {
      throw new NotFoundException('Application not found or unauthorized');
    }
    return this.repo.create(applicationId, application);
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

    return this.repo.sign(id, workerUserId, signatureData);
  }
}
