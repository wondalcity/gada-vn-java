import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class WorkersRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByUserId(userId: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM app.worker_profiles WHERE user_id = $1',
      [userId],
    );
    return rows[0] || null;
  }

  async updateByUserId(userId: string, data: Record<string, unknown>) {
    const { rows } = await this.db.query(
      `UPDATE app.worker_profiles
       SET full_name = COALESCE($2, full_name), updated_at = NOW()
       WHERE user_id = $1 RETURNING *`,
      [userId, data.fullName],
    );
    return rows[0];
  }
}
