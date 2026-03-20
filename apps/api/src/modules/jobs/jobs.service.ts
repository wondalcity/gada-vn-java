import { Injectable, NotFoundException } from '@nestjs/common';
import { JobsRepository } from './jobs.repository';
import { CacheService } from '../../common/cache/cache.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobListQueryDto } from './dto/job-list-query.dto';

const GEO_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class JobsService {
  constructor(
    private readonly repo: JobsRepository,
    private readonly cache: CacheService,
  ) {}

  async listJobs(query: JobListQueryDto) {
    const cacheKey = this.geoKey(query);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await this.repo.findMany(query);
    await this.cache.set(cacheKey, result, GEO_CACHE_TTL);
    return result;
  }

  async getDailyFeed(date: string, query: JobListQueryDto) {
    const cacheKey = `jobs:daily:${date}:${this.geoKey(query)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await this.repo.findByDate(date, query);
    await this.cache.set(cacheKey, result, GEO_CACHE_TTL);
    return result;
  }

  async getJobById(id: string) {
    const cacheKey = `jobs:id:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const job = await this.repo.findById(id);
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    await this.cache.set(cacheKey, job, GEO_CACHE_TTL);
    return job;
  }

  async getMyJobs(userId: string) {
    const managerId = await this.repo.getManagerIdByUserId(userId);
    return this.repo.findByManager(managerId);
  }

  async createJob(userId: string, dto: CreateJobDto) {
    const managerId = await this.repo.getManagerIdByUserId(userId);
    const job = await this.repo.create(managerId, dto);
    await this.cache.delPattern('jobs:geo:*');
    await this.cache.delPattern('jobs:daily:*');
    return job;
  }

  async updateJob(id: string, userId: string, dto: Partial<CreateJobDto>) {
    const managerId = await this.repo.getManagerIdByUserId(userId);
    const job = await this.repo.update(id, managerId, dto);
    await this.cache.del(`jobs:id:${id}`);
    await this.cache.delPattern('jobs:geo:*');
    return job;
  }

  async deleteJob(id: string, userId: string) {
    const managerId = await this.repo.getManagerIdByUserId(userId);
    await this.repo.softDelete(id, managerId);
    await this.cache.del(`jobs:id:${id}`);
    await this.cache.delPattern('jobs:geo:*');
    return { success: true };
  }

  private geoKey(query: JobListQueryDto): string {
    const lat = query.lat ? Number(query.lat).toFixed(2) : 'x';
    const lng = query.lng ? Number(query.lng).toFixed(2) : 'x';
    const radius = query.radiusKm ?? 10;
    return `jobs:geo:${lat}:${lng}:${radius}`;
  }
}
