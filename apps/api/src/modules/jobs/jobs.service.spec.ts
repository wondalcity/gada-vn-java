import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsRepository } from './jobs.repository';

const mockJobsRepository = {
  findMany: jest.fn(),
  findByDate: jest.fn(),
  findById: jest.fn(),
  getManagerIdByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: JobsRepository, useValue: mockJobsRepository },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    jest.clearAllMocks();
  });

  describe('getJobById', () => {
    it('returns job when found', async () => {
      const job = { id: 'job-id-1', title: '콘크리트 작업', daily_wage: 500000 };
      mockJobsRepository.findById.mockResolvedValue(job);

      const result = await service.getJobById('job-id-1');
      expect(result).toEqual(job);
    });

    it('throws NotFoundException when job not found', async () => {
      mockJobsRepository.findById.mockResolvedValue(null);

      await expect(service.getJobById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listJobs', () => {
    it('delegates to repository with query params', async () => {
      const jobs = [{ id: 'j1' }, { id: 'j2' }];
      mockJobsRepository.findMany.mockResolvedValue(jobs);

      const query = { lat: 10.7, lng: 106.7, radiusKm: 20 };
      const result = await service.listJobs(query);

      expect(result).toEqual(jobs);
      expect(mockJobsRepository.findMany).toHaveBeenCalledWith(query);
    });
  });

  describe('getDailyFeed', () => {
    it('returns jobs for the given date', async () => {
      const jobs = [{ id: 'j1', work_date: '2026-03-20' }];
      mockJobsRepository.findByDate.mockResolvedValue(jobs);

      const result = await service.getDailyFeed('2026-03-20', {});
      expect(result).toEqual(jobs);
      expect(mockJobsRepository.findByDate).toHaveBeenCalledWith('2026-03-20', {});
    });
  });

  describe('createJob', () => {
    it('resolves manager id and creates job', async () => {
      const newJob = { id: 'new-job', title: '타일 작업' };
      mockJobsRepository.getManagerIdByUserId.mockResolvedValue('manager-id-1');
      mockJobsRepository.create.mockResolvedValue(newJob);

      const dto = {
        siteId: 'site-1', title: '타일 작업', workDate: '2026-03-21',
        dailyWage: 450000, slotsTotal: 3,
      };
      const result = await service.createJob('user-id', dto);

      expect(result).toEqual(newJob);
      expect(mockJobsRepository.create).toHaveBeenCalledWith('manager-id-1', dto);
    });
  });

  describe('deleteJob', () => {
    it('soft-deletes the job', async () => {
      mockJobsRepository.getManagerIdByUserId.mockResolvedValue('manager-id-1');
      mockJobsRepository.softDelete.mockResolvedValue(undefined);

      const result = await service.deleteJob('job-id', 'user-id');
      expect(result).toEqual({ success: true });
    });
  });
});
