import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkersRepository } from './workers.repository';

@Injectable()
export class WorkersService {
  constructor(private readonly repo: WorkersRepository) {}

  async getProfile(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    // Return empty profile stub if not set up yet
    return profile || { user_id: userId, full_name: null, experience_months: 0, trade_ids: [] };
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    return this.repo.updateByUserId(userId, data);
  }

  async getHires(userId: string) {
    return this.repo.findHiresByUserId(userId);
  }

  async getAttendance(userId: string, jobId?: string) {
    return this.repo.findAttendanceByUserId(userId, jobId);
  }

  async getSavedLocations(userId: string) {
    return this.repo.findSavedLocationsByUserId(userId);
  }

  async upsertSavedLocation(
    userId: string,
    data: { label: string; address?: string | null; lat: number; lng: number; isDefault?: boolean },
  ) {
    return this.repo.upsertSavedLocation(userId, data);
  }

  async deleteSavedLocation(userId: string, locationId: string) {
    return this.repo.deleteSavedLocation(userId, locationId);
  }

  async getTradeSkills(userId: string) {
    return this.repo.findTradeSkillsByUserId(userId);
  }

  async replaceTradeSkills(userId: string, skills: { tradeId: number; years: number }[]) {
    return this.repo.replaceTradeSkillsByUserId(userId, skills);
  }

  // ── Experiences ───────────────────────────────────────────────────────────

  async getExperiences(userId: string) {
    return this.repo.findExperiencesByUserId(userId);
  }

  async createExperience(
    userId: string,
    data: { companyName: string; role: string; startDate: string; endDate?: string | null; description?: string | null },
  ) {
    return this.repo.createExperience(userId, data);
  }

  async updateExperience(
    userId: string,
    experienceId: string,
    data: { companyName?: string; role?: string; startDate?: string; endDate?: string | null; description?: string | null },
  ) {
    const result = await this.repo.updateExperience(userId, experienceId, data);
    if (!result) throw new Error(`Experience ${experienceId} not found`);
    return result;
  }

  async deleteExperience(userId: string, experienceId: string) {
    const deleted = await this.repo.deleteExperience(userId, experienceId);
    return { deleted };
  }
}
