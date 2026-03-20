import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { AuthRepository } from './auth.repository';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { RegisterFcmDto } from './dto/register-fcm.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly repo: AuthRepository,
  ) {}

  async verifyAndGetOrCreateUser(idToken: string) {
    const decoded = await this.firebase.verifyIdToken(idToken);
    const existing = await this.repo.findByFirebaseUid(decoded.uid);

    if (existing) {
      return { user: existing, isNew: false };
    }

    const user = await this.repo.create({
      firebaseUid: decoded.uid,
      phone: decoded.phone_number || null,
      email: decoded.email || null,
      role: 'WORKER',
    });

    return { user, isNew: true };
  }

  async register(currentUser: CurrentUserPayload, dto: RegisterDto) {
    return this.repo.updateRole(currentUser.id, dto.role);
  }

  async registerFcmToken(userId: string, dto: RegisterFcmDto) {
    return this.repo.upsertFcmToken(userId, dto.token, dto.platform);
  }
}
