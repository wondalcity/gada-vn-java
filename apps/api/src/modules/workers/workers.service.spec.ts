import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { WorkersRepository } from './workers.repository';

const mockWorkersRepository = {
  findByUserId: jest.fn(),
  updateByUserId: jest.fn(),
};

describe('WorkersService', () => {
  let service: WorkersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkersService,
        { provide: WorkersRepository, useValue: mockWorkersRepository },
      ],
    }).compile();

    service = module.get<WorkersService>(WorkersService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('returns profile when found', async () => {
      const profile = { id: 'wp-1', user_id: 'u-1', full_name: '홍길동' };
      mockWorkersRepository.findByUserId.mockResolvedValue(profile);

      const result = await service.getProfile('u-1');
      expect(result).toEqual(profile);
    });

    it('throws NotFoundException when profile not found', async () => {
      mockWorkersRepository.findByUserId.mockResolvedValue(null);
      await expect(service.getProfile('u-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('calls repository update', async () => {
      const updated = { id: 'wp-1', full_name: '이순신' };
      mockWorkersRepository.updateByUserId.mockResolvedValue(updated);

      const result = await service.updateProfile('u-1', { fullName: '이순신' });
      expect(result).toEqual(updated);
    });
  });
});
