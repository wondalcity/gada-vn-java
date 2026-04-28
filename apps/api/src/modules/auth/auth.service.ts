import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { AuthRepository } from './auth.repository';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { RegisterFcmDto } from './dto/register-fcm.dto';

// Simple in-memory OTP store (use Redis in production)
const OTP_STORE = new Map<string, { otp: string; expiresAt: number }>();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp(): string {
  if (process.env.NODE_ENV !== 'production') return '999999';
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(phone: string): string {
  // Ensure +84 format for Vietnam
  const digits = phone.replace(/\D/g, '');
  // Handle +840xxxxxxx (frontend sends dialCode+localWithLeadingZero)
  if (digits.startsWith('840')) return `+84${digits.slice(3)}`;
  if (digits.startsWith('84')) return `+${digits}`;
  if (digits.startsWith('0')) return `+84${digits.slice(1)}`;
  return `+${digits}`;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly repo: AuthRepository,
  ) {}

  async verifyAndGetOrCreateUser(idToken: string) {
    let decoded: Awaited<ReturnType<typeof this.firebase.verifyIdToken>>;
    try {
      decoded = await this.firebase.verifyIdToken(idToken);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      this.logger.error(`verifyIdToken failed: code=${code}`, err);
      if (code === 'auth/id-token-expired') throw new UnauthorizedException('토큰이 만료되었습니다.');
      if (code === 'auth/argument-error' || code === 'auth/invalid-id-token') throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      throw new UnauthorizedException(`Firebase 인증 실패: ${code || String(err)}`);
    }

    // 1. Try to find by firebase_uid (existing user)
    const existing = await this.repo.findByFirebaseUid(decoded.uid);
    if (existing) {
      // Backfill email and name from Google/social provider if not yet set
      if (decoded.email && !existing.email) {
        await this.repo.updateEmailIfNull(existing.id, decoded.email);
      }
      if (decoded.name) {
        await this.repo.updateWorkerNameIfNull(existing.id, decoded.name);
      }
      const profile = await this.repo.getMeProfile(existing.id);
      return { user: profile, isNew: false };
    }

    // 2. If phone is present, check if there's already a user with that phone
    //    (can happen when Firebase account is recreated after deletion)
    if (decoded.phone_number) {
      const byPhone = await this.repo.findByPhone(decoded.phone_number);
      if (byPhone) {
        // Link new Firebase UID to the existing account
        await this.repo.updateFirebaseUid(byPhone.id, decoded.uid);
        const profile = await this.repo.getMeProfile(byPhone.id);
        return { user: profile, isNew: false };
      }
    }

    // 3. Create new user
    const providerMap: Record<string, string> = {
      'google.com': 'google',
      'facebook.com': 'facebook',
      'phone': 'phone',
      'password': 'email',
    };
    const provider = providerMap[decoded.firebase?.sign_in_provider ?? 'phone'] ?? 'phone';

    try {
      const user = await this.repo.create({
        firebaseUid: decoded.uid,
        phone: decoded.phone_number || null,
        email: decoded.email || null,
        role: 'WORKER',
        provider,
      });
      await this.repo.ensureWorkerProfile(user.id, decoded.phone_number || null, decoded.name || null);
      const profile = await this.repo.getMeProfile(user.id);
      return { user: profile, isNew: true };
    } catch (err: unknown) {
      const pgErr = err as { code?: string; constraint?: string };
      this.logger.error(`DB error creating user uid=${decoded.uid}`, err);
      if (pgErr.code === '23505') {
        // Unique violation — race condition or duplicate; find the existing user
        const fallback = await this.repo.findByFirebaseUid(decoded.uid);
        if (fallback) {
          const profile = await this.repo.getMeProfile(fallback.id);
          return { user: profile, isNew: false };
        }
      }
      throw new InternalServerErrorException('사용자 생성에 실패했습니다.');
    }
  }

  async register(currentUser: CurrentUserPayload, dto: RegisterDto) {
    return this.repo.updateRole(currentUser.id, dto.role);
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; password?: string }) {
    // If email or password provided, update Firebase user as well
    if (data.email || data.password) {
      const dbUser = await this.repo.findById(userId);
      if (dbUser) {
        await this.firebase.updateFirebaseUser(dbUser.firebase_uid, {
          email: data.email,
          password: data.password,
        });
      }
    }
    return this.repo.updateProfile(userId, { name: data.name, email: data.email });
  }

  async linkPhone(userId: string, phoneIdToken: string): Promise<void> {
    const decoded = await this.firebase.verifyIdToken(phoneIdToken);
    if (!decoded.phone_number) {
      throw new BadRequestException('Phone ID token does not contain a phone number');
    }
    await this.repo.updatePhone(userId, decoded.phone_number);
  }

  async getMe(userId: string) {
    return this.repo.getMeProfile(userId);
  }

  async registerFcmToken(userId: string, dto: RegisterFcmDto) {
    return this.repo.upsertFcmToken(userId, dto.token, dto.platform);
  }

  async isTestPhone(phone: string): Promise<{ isTest: boolean }> {
    const isTest = await this.repo.isTestPhone(phone);
    return { isTest };
  }

  // ── OTP flow ────────────────────────────────────────────────────────────────

  async sendOtp(phone: string): Promise<{ message: string; devOtp?: string }> {
    const normalized = normalizePhone(phone);
    const otp = generateOtp();
    OTP_STORE.set(normalized, { otp, expiresAt: Date.now() + OTP_TTL_MS });

    // In production: send SMS via your SMS provider here
    // For now: log to console + return in dev mode
    console.log(`[OTP] ${normalized}: ${otp}`);

    const isDev = process.env.NODE_ENV !== 'production';
    return {
      message: '인증번호가 발송되었습니다.',
      ...(isDev ? { devOtp: otp } : {}),
    };
  }

  async verifyOtp(phone: string, otp: string): Promise<{ customToken?: string; devToken?: string; isNewUser: boolean }> {
    const normalized = normalizePhone(phone);
    const stored = OTP_STORE.get(normalized);

    if (!stored || stored.expiresAt < Date.now()) {
      throw new UnauthorizedException('인증번호가 만료되었습니다.');
    }
    if (stored.otp !== otp) {
      throw new UnauthorizedException('인증번호가 올바르지 않습니다.');
    }

    OTP_STORE.delete(normalized);

    // Find or create Firebase user by phone
    const { uid, isNew: isFirebaseNew } = await this.firebase.getOrCreateUserByPhone(normalized);

    // Find or create DB user (try by firebase uid first, then phone as fallback)
    let dbUser = await this.repo.findByFirebaseUid(uid);
    let isNewUser = isFirebaseNew;
    if (!dbUser) {
      dbUser = await this.repo.findByPhone(normalized);
      if (dbUser) {
        // Phone exists but with a different firebase uid — update it
        await this.repo.updateFirebaseUid(dbUser.id, uid);
        dbUser = { ...dbUser, firebase_uid: uid };
      } else {
        dbUser = await this.repo.create({ firebaseUid: uid, phone: normalized, email: null, role: 'WORKER' });
        await this.repo.ensureWorkerProfile(dbUser.id, normalized);
        isNewUser = true;
      }
    }

    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      // Dev mode: return a simple token format (dev_<userId>)
      return { devToken: `dev_${dbUser.id}`, isNewUser };
    }

    const customToken = await this.firebase.createCustomToken(uid);
    return { customToken, isNewUser };
  }

  // ── Email + password flow ────────────────────────────────────────────────────

  async loginEmail(email: string, password: string): Promise<{ customToken?: string; devToken?: string }> {
    // Use Firebase REST API to verify email/password
    const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

    if (!apiKey) {
      throw new BadRequestException('Email login not configured');
    }

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );

    if (!res.ok) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const data = await res.json() as { localId: string };
    const uid = data.localId;

    // Ensure user exists in DB
    let dbUser = await this.repo.findByFirebaseUid(uid);
    if (!dbUser) {
      dbUser = await this.repo.create({ firebaseUid: uid, phone: null, email, role: 'WORKER' });
    }

    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      return { devToken: `dev_${dbUser.id}` };
    }

    const customToken = await this.firebase.createCustomToken(uid);
    return { customToken };
  }

  // ── Facebook social login ────────────────────────────────────────────────────

  async socialFacebook(idToken: string): Promise<{ isNewUser: boolean; needsPhone: boolean; devToken?: string }> {
    if (!idToken) throw new UnauthorizedException('idToken이 필요합니다.');
    let decoded: Awaited<ReturnType<typeof this.firebase.verifyIdToken>>;
    try {
      decoded = await this.firebase.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('유효하지 않은 Firebase ID Token입니다.');
    }
    let dbUser = await this.repo.findByFirebaseUid(decoded.uid);
    let isNewUser = false;

    if (!dbUser) {
      dbUser = await this.repo.create({
        firebaseUid: decoded.uid,
        phone: decoded.phone_number || null,
        email: decoded.email || null,
        role: 'WORKER',
        provider: 'facebook',
      });
      await this.repo.ensureWorkerProfile(dbUser.id, decoded.phone_number || null, decoded.name || null);
      isNewUser = true;
    }

    const needsPhone = !dbUser.phone;
    const isDev = process.env.NODE_ENV !== 'production';
    return {
      isNewUser,
      needsPhone,
      ...(isDev ? { devToken: `dev_${dbUser.id}` } : {}),
    };
  }

  // ── Logout ───────────────────────────────────────────────────────────────────

  async logout(firebaseUid: string): Promise<void> {
    try {
      await this.firebase.revokeRefreshTokens(firebaseUid);
    } catch {
      // Ignore — local session will be cleared by client
    }
  }
}
