import { Injectable, NotFoundException } from '@nestjs/common';
import { JobsRepository } from './jobs.repository';
import { CreateJobDto } from './dto/create-job.dto';
import { JobListQueryDto } from './dto/job-list-query.dto';

@Injectable()
export class JobsService {
  constructor(private readonly repo: JobsRepository) {}

  async listJobs(query: JobListQueryDto) {
    return this.repo.findMany(query);
  }

  async getDailyFeed(date: string, query: JobListQueryDto) {
    return this.repo.findByDate(date, query);
  }

  async getJobById(id: string) {
    const job = await this.repo.findById(id);
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }

  async createJob(userId: string, dto: CreateJobDto) {
    const managerId = await this.repo.getManagerIdByUserId(userId);
    return this.repo.create(managerId, dto);
  }

  async updateJob(id: string, userId: string, dto: Partial<CreateJobDto>) {
    const managerId = await this.repo.getManagerIdByUserId(userId);
    return this.repo.update(id, managerId, dto);
  }

  async deleteJob(id: string, userId: string) {
    const managerId = await this.repo.getManagerIdByUserId(userId);
    await this.repo.softDelete(id, managerId);
    return { success: true };
  }
}
