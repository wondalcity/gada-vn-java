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

  async findRegistrationStatus(userId: string) {
    const { rows } = await this.db.query(
      `SELECT
         id, approval_status, rejection_reason, created_at as applied_at
       FROM app.manager_profiles
       WHERE user_id = $1`,
      [userId],
    );
    if (!rows[0]) {
      return {
        hasApplied: false,
        approvalStatus: null,
        rejectionReason: null,
        appliedAt: null,
      };
    }
    return {
      hasApplied: true,
      approvalStatus: rows[0].approval_status,
      rejectionReason: rows[0].rejection_reason,
      appliedAt: rows[0].applied_at,
    };
  }

  /** Create or update (upsert) manager profile — allows re-applying after rejection */
  async upsert(userId: string, data: Record<string, unknown>) {
    const companyName = (data.companyNameKo as string) || (data.companyName as string) || null;
    const companyNameVi = (data.companyNameVi as string) || null;
    const businessRegNumber = (data.businessRegistrationNumber as string) || null;
    const companyAddress = (data.companyAddress as string) || null;
    const businessType = (data.businessType as string) || 'CORPORATE';
    const representativeName = (data.representativeName as string) || null;
    const contactPhone = (data.contactPhone as string) || null;

    const { rows } = await this.db.query(
      `INSERT INTO app.manager_profiles
         (user_id, business_type, company_name, representative_name,
          contact_phone, approval_status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       ON CONFLICT (user_id) DO UPDATE SET
         business_type = EXCLUDED.business_type,
         company_name = EXCLUDED.company_name,
         representative_name = COALESCE(EXCLUDED.representative_name, app.manager_profiles.representative_name),
         contact_phone = COALESCE(EXCLUDED.contact_phone, app.manager_profiles.contact_phone),
         approval_status = 'PENDING',
         rejection_reason = NULL,
         updated_at = NOW()
       RETURNING *`,
      [userId, businessType, companyName, representativeName, contactPhone],
    );
    return rows[0];
  }

  async create(userId: string, data: Record<string, unknown>) {
    return this.upsert(userId, data);
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
