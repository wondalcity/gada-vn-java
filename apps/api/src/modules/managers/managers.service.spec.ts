import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ManagersService } from './managers.service';
import { ManagersRepository } from './managers.repository';

const mockManagersRepository = {
  findByUserId: jest.fn(),
  create: jest.fn(),
  updateByUserId: jest.fn(),
};

describe('ManagersService', () => {
  let service: ManagersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManagersService,
        { provide: ManagersRepository, useValue: mockManagersRepository },
      ],
    }).compile();

    service = module.get<ManagersService>(ManagersService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates a manager profile in PENDING status', async () => {
      const created = { id: 'mp-1', approval_status: 'PENDING' };
      mockManagersRepository.create.mockResolvedValue(created);

      const result = await service.register('user-id', {
        businessType: 'INDIVIDUAL',
        representativeName: '김철수',
      });

      expect(result).toEqual(created);
      expect(mockManagersRepository.create).toHaveBeenCalledWith('user-id', {
        businessType: 'INDIVIDUAL',
        representativeName: '김철수',
      });
    });
  });

  describe('getProfile', () => {
    it('throws NotFoundException when not found', async () => {
      mockManagersRepository.findByUserId.mockResolvedValue(null);
      await expect(service.getProfile('u-999')).rejects.toThrow(NotFoundException);
    });
  });
});
