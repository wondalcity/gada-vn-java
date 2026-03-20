import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminRepository } from './admin.repository';

@Injectable()
export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

  async listManagers(status: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.repo.findManagersPaginated(status, page, limit),
      this.repo.countManagers(status),
    ]);
    return { data, total, page, limit };
  }

  async getManager(id: string) {
    const manager = await this.repo.findManagerById(id);
    if (!manager) throw new NotFoundException(`Manager ${id} not found`);
    return manager;
  }

  async approveManager(id: string) {
    const manager = await this.repo.findManagerById(id);
    if (!manager) throw new NotFoundException(`Manager ${id} not found`);
    return this.repo.approveManager(id);
  }

  async rejectManager(id: string, reason: string) {
    const manager = await this.repo.findManagerById(id);
    if (!manager) throw new NotFoundException(`Manager ${id} not found`);
    return this.repo.rejectManager(id, reason);
  }
}
