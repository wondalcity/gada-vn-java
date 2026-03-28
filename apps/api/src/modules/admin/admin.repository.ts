import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AdminRepository {
  constructor(private readonly db: DatabaseService) {}

  async findManagersPaginated(status: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const { rows } = await this.db.query(
      `SELECT mp.*, u.phone, u.created_at as user_created_at
       FROM app.manager_profiles mp
       JOIN auth.users u ON mp.user_id = u.id
       WHERE mp.approval_status = $1
       ORDER BY mp.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );
    return rows;
  }

  async countManagers(status: string): Promise<number> {
    const { rows } = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM app.manager_profiles WHERE approval_status = $1',
      [status],
    );
    return parseInt(rows[0]?.count ?? '0');
  }

  async findManagerById(id: string) {
    const { rows } = await this.db.query(
      `SELECT mp.*, u.phone, u.created_at as user_created_at
       FROM app.manager_profiles mp
       JOIN auth.users u ON mp.user_id = u.id
       WHERE mp.id = $1`,
      [id],
    );
    return rows[0] || null;
  }

  async approveManager(id: string) {
    // Update manager profile status
    const { rows } = await this.db.query(
      `UPDATE app.manager_profiles
       SET approval_status = 'APPROVED', approved_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id],
    );
    const profile = rows[0];
    if (profile) {
      // Also update the user's role to MANAGER
      await this.db.query(
        `UPDATE auth.users SET role = 'MANAGER', updated_at = NOW() WHERE id = $1`,
        [profile.user_id],
      );
    }
    return profile;
  }

  // ── Notification helpers ──────────────────────────────────────────────────

  async searchUsers(search: string, role: string, limit = 30) {
    const roleFilter = role ? `AND u.role = $2` : '';
    const params: unknown[] = [`%${search}%`];
    if (role) params.push(role);
    params.push(limit);
    const limitIdx = params.length;

    const { rows } = await this.db.query(
      `SELECT u.id AS user_id,
              COALESCE(wp.full_name, mp.representative_name, u.phone, u.email) AS name,
              u.phone, u.email, u.role
       FROM auth.users u
       LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
       LEFT JOIN app.manager_profiles mp ON mp.user_id = u.id
       WHERE (
         COALESCE(wp.full_name, mp.representative_name, u.phone, u.email) ILIKE $1
         OR u.phone ILIKE $1
         OR u.email ILIKE $1
       ) ${roleFilter}
       ORDER BY u.created_at DESC
       LIMIT $${limitIdx}`,
      params,
    );
    return rows;
  }

  async getUsersByRole(role: string) {
    const { rows } = await this.db.query(
      `SELECT u.id AS user_id,
              COALESCE(wp.full_name, mp.representative_name, u.phone, u.email) AS name,
              u.phone, u.email, u.role
       FROM auth.users u
       LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
       LEFT JOIN app.manager_profiles mp ON mp.user_id = u.id
       WHERE u.role = $1
       ORDER BY u.created_at DESC`,
      [role],
    );
    return rows;
  }

  async getUserPhones(userIds: string[]): Promise<{ user_id: string; phone: string }[]> {
    if (userIds.length === 0) return [];
    const { rows } = await this.db.query<{ user_id: string; phone: string }>(
      `SELECT id AS user_id, phone FROM auth.users WHERE id = ANY($1) AND phone IS NOT NULL`,
      [userIds],
    );
    return rows;
  }

  async findPushSchedules() {
    const { rows } = await this.db.query(
      `SELECT * FROM ops.push_schedules ORDER BY scheduled_at DESC LIMIT 100`,
    );
    return rows;
  }

  async createPushSchedule(data: {
    title: string;
    body: string;
    targetUserIds?: string[];
    targetRole?: string;
    scheduledAt: string;
    createdBy?: string;
  }) {
    const { rows } = await this.db.query(
      `INSERT INTO ops.push_schedules
         (title, body, target_user_ids, target_role, scheduled_at, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
       RETURNING *`,
      [
        data.title, data.body,
        data.targetUserIds ?? null,
        data.targetRole ?? null,
        data.scheduledAt,
        data.createdBy ?? 'admin',
      ],
    );
    return rows[0];
  }

  async cancelPushSchedule(id: string) {
    const { rows } = await this.db.query(
      `UPDATE ops.push_schedules SET status = 'CANCELLED', updated_at = NOW()
       WHERE id = $1 AND status = 'PENDING' RETURNING *`,
      [id],
    );
    return rows[0] ?? null;
  }

  async rejectManager(id: string, reason: string) {
    const { rows } = await this.db.query(
      `UPDATE app.manager_profiles
       SET approval_status = 'REJECTED', rejection_reason = $2,
           approved_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, reason],
    );
    return rows[0];
  }
}
