import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

export interface UserRow {
  id: string;
  firebase_uid: string;
  phone: string | null;
  email: string | null;
  role: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByFirebaseUid(firebaseUid: string) {
    const { rows } = await this.db.query<UserRow>(
      'SELECT * FROM auth.users WHERE firebase_uid = $1',
      [firebaseUid],
    );
    return rows[0] || null;
  }

  async create(data: {
    firebaseUid: string;
    phone: string | null;
    email: string | null;
    role: string;
  }) {
    const { rows } = await this.db.query<UserRow>(
      `INSERT INTO auth.users (firebase_uid, phone, email, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.firebaseUid, data.phone, data.email, data.role],
    );
    return rows[0];
  }

  async updateFirebaseUid(userId: string, firebaseUid: string) {
    await this.db.query(
      'UPDATE auth.users SET firebase_uid = $1, updated_at = NOW() WHERE id = $2',
      [firebaseUid, userId],
    );
  }

  async updateRole(userId: string, role: string) {
    const { rows } = await this.db.query<UserRow>(
      'UPDATE auth.users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [role, userId],
    );
    return rows[0];
  }

  async upsertFcmToken(userId: string, token: string, platform: string) {
    await this.db.query(
      `INSERT INTO ops.fcm_tokens (user_id, token, platform, last_seen_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, token) DO UPDATE SET last_seen_at = NOW(), platform = $3`,
      [userId, token, platform],
    );
    return { success: true };
  }

  async findById(userId: string) {
    const { rows } = await this.db.query<UserRow>(
      'SELECT * FROM auth.users WHERE id = $1',
      [userId],
    );
    return rows[0] || null;
  }

  async findByEmail(email: string) {
    const { rows } = await this.db.query<UserRow>(
      'SELECT * FROM auth.users WHERE email = $1',
      [email],
    );
    return rows[0] || null;
  }

  async findByPhone(phone: string) {
    const { rows } = await this.db.query<UserRow>(
      'SELECT * FROM auth.users WHERE phone = $1',
      [phone],
    );
    return rows[0] || null;
  }

  async getMeProfile(userId: string) {
    // Get user + worker name + manager status
    const { rows } = await this.db.query(
      `SELECT
         u.id, u.firebase_uid, u.phone, u.email, u.role, u.status,
         u.created_at, u.updated_at,
         wp.full_name as worker_name,
         mp.approval_status as manager_status
       FROM auth.users u
       LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
       LEFT JOIN app.manager_profiles mp ON mp.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    const managerStatusMap: Record<string, 'pending' | 'active' | 'rejected'> = {
      PENDING: 'pending',
      APPROVED: 'active',
      REJECTED: 'rejected',
      REVOKED: 'rejected',
    };
    return {
      id: r.id,
      firebaseUid: r.firebase_uid,
      name: r.worker_name || r.phone || r.email || 'User',
      phone: r.phone,
      email: r.email,
      locale: 'ko' as const,
      role: r.role,
      status: r.status,
      isWorker: r.role === 'WORKER' || r.role === 'MANAGER',
      isManager: r.role === 'MANAGER' || r.manager_status === 'APPROVED',
      isAdmin: r.role === 'ADMIN',
      managerStatus: r.manager_status ? (managerStatusMap[r.manager_status] ?? null) : null,
      roles: [r.role],
    };
  }

  async updatePhone(userId: string, phone: string) {
    await this.db.query(
      'UPDATE auth.users SET phone = $1, updated_at = NOW() WHERE id = $2',
      [phone, userId],
    );
  }

  async updateProfile(userId: string, data: { name?: string; email?: string }) {
    // Update email if provided
    if (data.email) {
      await this.db.query(
        'UPDATE auth.users SET email = $1, updated_at = NOW() WHERE id = $2',
        [data.email, userId],
      );
    }
    // Update full_name in worker_profiles if exists
    if (data.name) {
      await this.db.query(
        `INSERT INTO app.worker_profiles (user_id, full_name, date_of_birth, experience_months)
         VALUES ($1, $2, '1990-01-01', 0)
         ON CONFLICT (user_id) DO UPDATE SET full_name = $2, updated_at = NOW()`,
        [userId, data.name],
      );
    }
    return this.getMeProfile(userId);
  }
}
