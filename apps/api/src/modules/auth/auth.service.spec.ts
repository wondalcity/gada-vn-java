import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { FirebaseService } from '../../common/firebase/firebase.service';

const mockFirebaseService = {
  verifyIdToken: jest.fn(),
};

const mockAuthRepository = {
  findByFirebaseUid: jest.fn(),
  create: jest.fn(),
  updateRole: jest.fn(),
  upsertFcmToken: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: AuthRepository, useValue: mockAuthRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('verifyAndGetOrCreateUser', () => {
    it('returns existing user without creating a new one', async () => {
      const decoded = { uid: 'firebase-uid-1', phone_number: '+84123456789' };
      const existingUser = { id: 'uuid-1', firebase_uid: 'firebase-uid-1', role: 'WORKER' };

      mockFirebaseService.verifyIdToken.mockResolvedValue(decoded);
      mockAuthRepository.findByFirebaseUid.mockResolvedValue(existingUser);

      const result = await service.verifyAndGetOrCreateUser('valid-token');

      expect(result).toEqual({ user: existingUser, isNew: false });
      expect(mockAuthRepository.create).not.toHaveBeenCalled();
    });

    it('creates a new user when not found', async () => {
      const decoded = { uid: 'firebase-uid-new', phone_number: '+84999888777' };
      const newUser = { id: 'uuid-new', firebase_uid: 'firebase-uid-new', role: 'WORKER' };

      mockFirebaseService.verifyIdToken.mockResolvedValue(decoded);
      mockAuthRepository.findByFirebaseUid.mockResolvedValue(null);
      mockAuthRepository.create.mockResolvedValue(newUser);

      const result = await service.verifyAndGetOrCreateUser('new-token');

      expect(result).toEqual({ user: newUser, isNew: true });
      expect(mockAuthRepository.create).toHaveBeenCalledWith({
        firebaseUid: 'firebase-uid-new',
        phone: '+84999888777',
        email: null,
        role: 'WORKER',
      });
    });
  });

  describe('registerFcmToken', () => {
    it('calls upsertFcmToken with correct params', async () => {
      mockAuthRepository.upsertFcmToken.mockResolvedValue({ success: true });

      const result = await service.registerFcmToken('user-id', {
        token: 'fcm-token-abc',
        platform: 'ANDROID',
      });

      expect(result).toEqual({ success: true });
      expect(mockAuthRepository.upsertFcmToken).toHaveBeenCalledWith(
        'user-id',
        'fcm-token-abc',
        'ANDROID',
      );
    });
  });
});
