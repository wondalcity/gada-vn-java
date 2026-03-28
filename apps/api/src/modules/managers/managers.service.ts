import { Injectable } from '@nestjs/common';
import { ManagersRepository } from './managers.repository';

@Injectable()
export class ManagersService {
  constructor(private readonly repo: ManagersRepository) {}

  async register(userId: string, data: Record<string, unknown>) {
    // Upsert: if already exists, update (re-apply)
    return this.repo.upsert(userId, data);
  }

  async getRegistrationStatus(userId: string) {
    return this.repo.findRegistrationStatus(userId);
  }

  async getProfile(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) return null;
    return profile;
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    return this.repo.updateByUserId(userId, data);
  }
}
