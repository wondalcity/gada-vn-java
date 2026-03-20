import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkersRepository } from './workers.repository';

@Injectable()
export class WorkersService {
  constructor(private readonly repo: WorkersRepository) {}

  async getProfile(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new NotFoundException('Worker profile not found');
    return profile;
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    return this.repo.updateByUserId(userId, data);
  }
}
