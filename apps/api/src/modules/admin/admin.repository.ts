import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

const CDN = process.env.CLOUDFRONT_URL ?? '';
function cdnUrl(key: string | null): string | null {
  if (!key) return null;
  return CDN ? `${CDN}/${key}` : key;
}

@Injectable()
export class AdminRepository {
  constructor(private readonly db: DatabaseService) {}

  // ── Worker management ─────────────────────────────────────────────────────

  async findWorkers(search: string, limit: number) {
    const param = `%${search}%`;
    const { rows } = await this.db.query(
      `SELECT
         wp.id, wp.full_name, wp.current_province, wp.id_verified, wp.created_at,
         u.phone, u.role
       FROM app.worker_profiles wp
       JOIN auth.users u ON wp.user_id = u.id
       WHERE (
         wp.full_name ILIKE $1
         OR u.phone ILIKE $1
       )
       ORDER BY wp.created_at DESC
       LIMIT $2`,
      [param, limit],
    );
    return rows.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      phone: r.phone,
      current_province: r.current_province,
      id_verified: r.id_verified,
      created_at: r.created_at,
      is_manager: r.role === 'MANAGER',
    }));
  }

  async countWorkers(search: string): Promise<number> {
    const param = `%${search}%`;
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM app.worker_profiles wp
       JOIN auth.users u ON wp.user_id = u.id
       WHERE wp.full_name ILIKE $1 OR u.phone ILIKE $1`,
      [param],
    );
    return parseInt(rows[0]?.count ?? '0');
  }

  async findWorkerById(id: string) {
    const { rows } = await this.db.query(
      `SELECT
         wp.*,
         u.phone, u.email, u.id AS user_id, u.role,
         t.name_ko AS trade_name_ko,
         mp.id AS manager_profile_id,
         mp.approval_status AS manager_approval_status,
         mp.company_name AS manager_company_name,
         mp.representative_name AS manager_representative_name,
         mp.approved_at AS manager_approved_at
       FROM app.worker_profiles wp
       JOIN auth.users u ON wp.user_id = u.id
       LEFT JOIN ref.construction_trades t ON wp.primary_trade_id = t.id
       LEFT JOIN app.manager_profiles mp ON mp.user_id = u.id
       WHERE wp.id = $1`,
      [id],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id,
      user_id: r.user_id,
      full_name: r.full_name,
      date_of_birth: r.date_of_birth,
      gender: r.gender,
      bio: r.bio,
      experience_months: r.experience_months,
      primary_trade_id: r.primary_trade_id,
      current_province: r.current_province,
      current_district: r.current_district,
      id_number: r.id_number,
      id_verified: r.id_verified,
      id_verified_at: r.id_verified_at,
      signature_url: cdnUrl(r.signature_s3_key),
      id_front_url: cdnUrl(r.id_front_s3_key),
      id_back_url: cdnUrl(r.id_back_s3_key),
      bank_book_url: cdnUrl(r.bank_book_s3_key),
      profile_picture_s3_key: r.profile_picture_s3_key,
      bank_name: r.bank_name,
      bank_account_number: r.bank_account_number,
      terms_accepted: r.terms_accepted ?? false,
      privacy_accepted: r.privacy_accepted ?? false,
      profile_complete: r.profile_complete,
      lat: r.lat ? parseFloat(r.lat) : null,
      lng: r.lng ? parseFloat(r.lng) : null,
      created_at: r.created_at,
      phone: r.phone,
      email: r.email,
      trade_name_ko: r.trade_name_ko,
      role: r.role,
      is_manager: r.role === 'MANAGER',
      manager_profile_id: r.manager_profile_id,
      manager_approval_status: r.manager_approval_status,
      manager_company_name: r.manager_company_name,
      manager_representative_name: r.manager_representative_name,
      manager_approved_at: r.manager_approved_at,
    };
  }

  async findWorkerTradeSkills(workerId: string) {
    const { rows } = await this.db.query(
      `SELECT wts.trade_id, wts.years, t.name_ko, t.name_vi, t.code
       FROM app.worker_trade_skills wts
       JOIN ref.construction_trades t ON wts.trade_id = t.id
       WHERE wts.worker_id = $1
       ORDER BY wts.years DESC`,
      [workerId],
    );
    return rows;
  }

  async findAllTrades() {
    const { rows } = await this.db.query(
      `SELECT id, code, name_ko, name_vi
       FROM ref.construction_trades
       ORDER BY name_ko`,
    );
    return rows;
  }

  async updateWorkerProfile(id: string, data: Record<string, unknown>) {
    const { rows } = await this.db.query(
      `UPDATE app.worker_profiles SET
         full_name           = COALESCE($2, full_name),
         date_of_birth       = COALESCE($3::DATE, date_of_birth),
         gender              = COALESCE($4, gender),
         bio                 = COALESCE($5, bio),
         primary_trade_id    = COALESCE($6::INT, primary_trade_id),
         experience_months   = COALESCE($7::INT, experience_months),
         profile_complete    = COALESCE($8, profile_complete),
         id_verified         = COALESCE($9, id_verified),
         id_number           = COALESCE($10, id_number),
         bank_name           = COALESCE($11, bank_name),
         bank_account_number = COALESCE($12, bank_account_number),
         updated_at          = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.fullName ?? null,
        data.dateOfBirth ?? null,
        data.gender ?? null,
        data.bio ?? null,
        data.primaryTradeId ?? null,
        data.experienceMonths ?? null,
        data.profileComplete ?? null,
        data.idVerified ?? null,
        data.idNumber ?? null,
        data.bankName ?? null,
        data.bankAccountNumber ?? null,
      ],
    );
    return rows[0];
  }

  async replaceWorkerTradeSkills(workerId: string, skills: { tradeId: number; years: number }[]) {
    await this.db.query('DELETE FROM app.worker_trade_skills WHERE worker_id = $1', [workerId]);
    for (const s of skills) {
      await this.db.query(
        `INSERT INTO app.worker_trade_skills (worker_id, trade_id, years)
         VALUES ($1, $2, $3)
         ON CONFLICT (worker_id, trade_id) DO UPDATE SET years = $3`,
        [workerId, s.tradeId, s.years],
      );
    }
    return this.findWorkerTradeSkills(workerId);
  }

  async promoteWorker(data: {
    userId: string;
    businessType: string;
    representativeName: string;
    companyName?: string;
    representativeDob?: string;
    representativeGender?: string;
    businessRegNumber?: string;
    contactPhone?: string;
    contactAddress?: string;
    province?: string;
    firstSiteName?: string;
    firstSiteAddress?: string;
  }) {
    const { rows } = await this.db.query(
      `INSERT INTO app.manager_profiles
         (user_id, business_type, representative_name, company_name,
          representative_dob, representative_gender, business_reg_number,
          contact_phone, contact_address, province,
          first_site_name, first_site_address,
          approval_status, approved_at, terms_accepted, privacy_accepted)
       VALUES ($1, $2, $3, $4, $5::DATE, $6, $7, $8, $9, $10, $11, $12,
               'APPROVED', NOW(), TRUE, TRUE)
       ON CONFLICT (user_id) DO UPDATE SET
         business_type       = EXCLUDED.business_type,
         representative_name = EXCLUDED.representative_name,
         company_name        = EXCLUDED.company_name,
         representative_dob  = EXCLUDED.representative_dob,
         representative_gender = EXCLUDED.representative_gender,
         business_reg_number = EXCLUDED.business_reg_number,
         contact_phone       = EXCLUDED.contact_phone,
         contact_address     = EXCLUDED.contact_address,
         province            = EXCLUDED.province,
         first_site_name     = EXCLUDED.first_site_name,
         first_site_address  = EXCLUDED.first_site_address,
         approval_status     = 'APPROVED',
         approved_at         = NOW(),
         updated_at          = NOW()
       RETURNING *`,
      [
        data.userId, data.businessType, data.representativeName,
        data.companyName ?? null, data.representativeDob ?? null,
        data.representativeGender ?? null, data.businessRegNumber ?? null,
        data.contactPhone ?? null, data.contactAddress ?? null,
        data.province ?? null, data.firstSiteName ?? null,
        data.firstSiteAddress ?? null,
      ],
    );
    // Upgrade role to MANAGER
    await this.db.query(
      `UPDATE auth.users SET role = 'MANAGER', updated_at = NOW() WHERE id = $1`,
      [data.userId],
    );
    return rows[0];
  }

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

  async revokeManager(id: string) {
    const { rows } = await this.db.query(
      `UPDATE app.manager_profiles
       SET approval_status = 'REVOKED', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id],
    );
    const profile = rows[0];
    if (profile) {
      // Downgrade user role back to WORKER
      await this.db.query(
        `UPDATE auth.users SET role = 'WORKER', updated_at = NOW() WHERE id = $1`,
        [profile.user_id],
      );
    }
    return profile;
  }

  async updateManagerProfile(id: string, data: Record<string, unknown>) {
    const { rows } = await this.db.query(
      `UPDATE app.manager_profiles SET
         business_type       = COALESCE($2, business_type),
         company_name        = COALESCE($3, company_name),
         representative_name = COALESCE($4, representative_name),
         representative_dob  = COALESCE($5::DATE, representative_dob),
         representative_gender = COALESCE($6, representative_gender),
         contact_phone       = COALESCE($7, contact_phone),
         contact_address     = COALESCE($8, contact_address),
         province            = COALESCE($9, province),
         business_reg_number = COALESCE($10, business_reg_number),
         first_site_name     = COALESCE($11, first_site_name),
         first_site_address  = COALESCE($12, first_site_address),
         updated_at          = NOW()
       WHERE id = $1 RETURNING *`,
      [
        id,
        data.businessType ?? null,
        data.companyName ?? null,
        data.representativeName ?? null,
        data.representativeDob ?? null,
        data.representativeGender ?? null,
        data.contactPhone ?? null,
        data.contactAddress ?? null,
        data.province ?? null,
        data.businessRegNumber ?? null,
        data.firstSiteName ?? null,
        data.firstSiteAddress ?? null,
      ],
    );
    return rows[0];
  }
}
