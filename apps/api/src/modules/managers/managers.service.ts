import { Injectable, NotFoundException } from '@nestjs/common';
import { ManagersRepository } from './managers.repository';

@Injectable()
export class ManagersService {
  constructor(private readonly repo: ManagersRepository) {}

  async register(userId: string, data: Record<string, unknown>) {
    return this.repo.create(userId, data);
  }

  async getProfile(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new NotFoundException('Manager profile not found');
    return profile;
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    return this.repo.updateByUserId(userId, data);
  }
}
