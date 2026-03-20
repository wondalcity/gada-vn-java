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
    const { rows } = await this.db.query(
      `UPDATE app.manager_profiles
       SET approval_status = 'APPROVED', reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id],
    );
    return rows[0];
  }

  async rejectManager(id: string, reason: string) {
    const { rows } = await this.db.query(
      `UPDATE app.manager_profiles
       SET approval_status = 'REJECTED', rejection_reason = $2,
           reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, reason],
    );
    return rows[0];
  }
}
