import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsRepository } from './applications.repository';

const mockRepo = {
  findByWorkerAndJob: jest.fn(),
  findByWorkerUserId: jest.fn(),
  findByJobId: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
};

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: ApplicationsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
    jest.clearAllMocks();
  });

  describe('apply', () => {
    it('creates application when no prior application exists', async () => {
      const created = { id: 'app-1', status: 'PENDING' };
      mockRepo.findByWorkerAndJob.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(created);

      const result = await service.apply('user-1', 'job-1', {});

      expect(result).toEqual(created);
      expect(mockRepo.create).toHaveBeenCalledWith('user-1', 'job-1', {});
    });

    it('throws ConflictException when already applied', async () => {
      mockRepo.findByWorkerAndJob.mockResolvedValue({ id: 'app-existing' });

      await expect(service.apply('user-1', 'job-1', {})).rejects.toThrow(ConflictException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('findByWorker', () => {
    it('returns paginated list', async () => {
      const apps = [{ id: 'app-1', job_title: '콘크리트 작업' }];
      mockRepo.findByWorkerUserId.mockResolvedValue(apps);

      const result = await service.findByWorker('user-1', 1, 10);
      expect(result).toEqual(apps);
      expect(mockRepo.findByWorkerUserId).toHaveBeenCalledWith('user-1', 1, 10);
    });
  });

  describe('findByJob', () => {
    it('returns applications for a job', async () => {
      const apps = [{ id: 'app-1', worker_name: '홍길동' }];
      mockRepo.findByJobId.mockResolvedValue(apps);

      const result = await service.findByJob('job-1', 'manager-user-1');
      expect(result).toEqual(apps);
    });
  });

  describe('updateStatus', () => {
    it('updates status when application exists', async () => {
      const updated = { id: 'app-1', status: 'ACCEPTED' };
      mockRepo.findById.mockResolvedValue({ id: 'app-1', status: 'PENDING' });
      mockRepo.updateStatus.mockResolvedValue(updated);

      const result = await service.updateStatus('app-1', 'manager-user-1', 'ACCEPTED');
      expect(result).toEqual(updated);
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('app-1', 'manager-user-1', 'ACCEPTED');
    });

    it('throws NotFoundException when application not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updateStatus('no-app', 'manager-1', 'ACCEPTED')).rejects.toThrow(NotFoundException);
    });
  });
});
