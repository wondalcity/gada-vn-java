import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class ManagersRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByUserId(userId: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM app.manager_profiles WHERE user_id = $1',
      [userId],
    );
    return rows[0] || null;
  }

  async create(userId: string, data: Record<string, unknown>) {
    const { rows } = await this.db.query(
      `INSERT INTO app.manager_profiles
         (user_id, business_type, representative_name, company_name,
          contact_phone, approval_status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING') RETURNING *`,
      [userId, data.businessType, data.representativeName, data.companyName, data.contactPhone],
    );
    return rows[0];
  }

  async updateByUserId(userId: string, data: Record<string, unknown>) {
    const { rows } = await this.db.query(
      `UPDATE app.manager_profiles
       SET contact_phone = COALESCE($2, contact_phone), updated_at = NOW()
       WHERE user_id = $1 RETURNING *`,
      [userId, data.contactPhone],
    );
    return rows[0];
  }
}
