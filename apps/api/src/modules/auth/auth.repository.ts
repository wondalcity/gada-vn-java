import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

interface UserRow {
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
}
