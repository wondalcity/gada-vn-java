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
      `SELECT mp.*, u.phone, u.created_at as user_created_at,
              wp.full_name AS worker_full_name,
              (SELECT cs.name FROM app.manager_site_assignments msa
               JOIN app.construction_sites cs ON cs.id = msa.site_id
               WHERE msa.manager_id = mp.id
               ORDER BY msa.assigned_at DESC LIMIT 1) AS site_name
       FROM app.manager_profiles mp
       JOIN auth.users u ON mp.user_id = u.id
       LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
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
      `SELECT mp.*, u.phone, u.created_at as user_created_at,
              wp.full_name AS worker_full_name
       FROM app.manager_profiles mp
       JOIN auth.users u ON mp.user_id = u.id
       LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
       WHERE mp.id = $1`,
      [id],
    );
    return rows[0] || null;
  }

  // ── Manager-site assignments (many-to-many) ──────────────────────────────

  async findManagerSites(managerId: string) {
    const { rows } = await this.db.query(
      `SELECT cs.id, cs.name, cs.address, cs.province, cs.district,
              cs.status, cs.site_type, msa.assigned_at
       FROM app.manager_site_assignments msa
       JOIN app.construction_sites cs ON cs.id = msa.site_id
       WHERE msa.manager_id = $1
       ORDER BY msa.assigned_at DESC`,
      [managerId],
    );
    return rows;
  }

  async assignManagerToSite(managerId: string, siteId: string, assignedBy?: string) {
    const { rows } = await this.db.query(
      `INSERT INTO app.manager_site_assignments (manager_id, site_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (manager_id, site_id) DO NOTHING
       RETURNING *`,
      [managerId, siteId, assignedBy ?? null],
    );
    return rows[0] ?? null;
  }

  async unassignManagerFromSite(managerId: string, siteId: string) {
    const { rows } = await this.db.query(
      `DELETE FROM app.manager_site_assignments
       WHERE manager_id = $1 AND site_id = $2
       RETURNING *`,
      [managerId, siteId],
    );
    return rows[0] ?? null;
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

  // ── Job management ─────────────────────────────────────────────────────────

  async findJobs(status: string, search: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = [];
    if (status) {
      params.push(status);
      conditions.push(`j.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(j.title ILIKE $${params.length} OR cs.name ILIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;
    const { rows } = await this.db.query(
      `SELECT j.id, j.title, j.work_date, j.daily_wage, j.slots_total, j.slots_filled, j.status,
              cs.name AS site_name, j.created_at
       FROM app.jobs j
       LEFT JOIN app.construction_sites cs ON j.site_id = cs.id
       ${where}
       ORDER BY j.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );
    return rows;
  }

  async countJobs(status: string, search: string): Promise<number> {
    const params: unknown[] = [];
    const conditions: string[] = [];
    if (status) {
      params.push(status);
      conditions.push(`j.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(j.title ILIKE $${params.length} OR cs.name ILIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM app.jobs j
       LEFT JOIN app.construction_sites cs ON j.site_id = cs.id
       ${where}`,
      params,
    );
    return parseInt(rows[0]?.count ?? '0');
  }

  async findWorkerContracts(workerId: string) {
    const { rows } = await this.db.query(
      `SELECT c.id, c.status, c.worker_signed_at, c.manager_signed_at, c.created_at,
              j.title AS job_title, j.work_date, j.daily_wage
       FROM app.contracts c
       JOIN app.jobs j ON c.job_id = j.id
       WHERE c.worker_id = $1
       ORDER BY c.created_at DESC`,
      [workerId],
    );
    return rows;
  }

  async findTestAccounts() {
    const { rows } = await this.db.query(
      `SELECT u.id, u.phone, u.role, u.status, u.created_at, wp.full_name
       FROM auth.users u
       LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
       WHERE u.is_test_account = TRUE
       ORDER BY u.created_at DESC`,
    );
    return rows;
  }

  async createTestAccount(data: { firebaseUid: string; phone: string; role: string; name: string | null }) {
    const { rows: userRows } = await this.db.query<{ id: string }>(
      `INSERT INTO auth.users (firebase_uid, phone, role, is_test_account)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (firebase_uid) DO UPDATE SET
         phone = EXCLUDED.phone, role = EXCLUDED.role, is_test_account = TRUE, updated_at = NOW()
       RETURNING id`,
      [data.firebaseUid, data.phone, data.role],
    );
    const userId = userRows[0].id;
    await this.db.query(
      `INSERT INTO app.worker_profiles (user_id, full_name)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW()`,
      [userId, data.name ?? data.phone],
    );
    const { rows } = await this.db.query(
      `SELECT u.id, u.phone, u.role, u.status, u.created_at, wp.full_name
       FROM auth.users u
       LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );
    return rows[0];
  }

  async deleteTestAccount(id: string) {
    const { rows } = await this.db.query(
      `DELETE FROM auth.users WHERE id = $1 AND is_test_account = TRUE RETURNING id`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findJobById(id: string) {
    const { rows } = await this.db.query(
      `SELECT j.*, cs.name AS site_name, cs.address, cs.province
       FROM app.jobs j
       LEFT JOIN app.construction_sites cs ON j.site_id = cs.id
       WHERE j.id = $1`,
      [id],
    );
    return rows[0] || null;
  }

  async createJob(data: Record<string, unknown>) {
    const { rows: siteRows } = await this.db.query<{ manager_id: string }>(
      'SELECT manager_id FROM app.construction_sites WHERE id = $1',
      [data.siteId],
    );
    if (!siteRows[0]) throw new Error('Site not found');
    const managerId = siteRows[0].manager_id;
    const { rows } = await this.db.query(
      `INSERT INTO app.jobs (site_id, manager_id, title, description, trade_id, work_date, start_time, end_time, daily_wage, slots_total, status)
       VALUES ($1, $2, $3, $4, $5, $6::DATE, $7::TIME, $8::TIME, $9, $10, 'OPEN')
       RETURNING *`,
      [
        data.siteId, managerId, data.title, data.description ?? null,
        data.tradeId ?? null, data.workDate, data.startTime ?? null, data.endTime ?? null,
        data.dailyWage, data.slotsTotal ?? 1,
      ],
    );
    return rows[0];
  }

  async updateJob(id: string, data: Record<string, unknown>) {
    const { rows } = await this.db.query(
      `UPDATE app.jobs SET
         title       = COALESCE($2, title),
         description = COALESCE($3, description),
         trade_id    = COALESCE($4::INT, trade_id),
         work_date   = COALESCE($5::DATE, work_date),
         start_time  = COALESCE($6::TIME, start_time),
         end_time    = COALESCE($7::TIME, end_time),
         daily_wage  = COALESCE($8, daily_wage),
         slots_total = COALESCE($9::INT, slots_total),
         status      = COALESCE($10, status),
         updated_at  = NOW()
       WHERE id = $1 RETURNING *`,
      [
        id,
        data.title ?? null, data.description ?? null, data.tradeId ?? null,
        data.workDate ?? null, data.startTime ?? null, data.endTime ?? null,
        data.dailyWage ?? null, data.slotsTotal ?? null, data.status ?? null,
      ],
    );
    return rows[0];
  }

  async cancelJob(id: string) {
    const { rows } = await this.db.query(
      `UPDATE app.jobs SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );
    return rows[0];
  }

  async findJobRoster(jobId: string) {
    const { rows: jobRows } = await this.db.query(
      `SELECT j.*, cs.name AS site_name, cs.address, cs.province, mp.company_name
       FROM app.jobs j
       LEFT JOIN app.construction_sites cs ON j.site_id = cs.id
       LEFT JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE j.id = $1`,
      [jobId],
    );
    const job = jobRows[0] || null;
    if (!job) return { job: null, roster: [] };

    const { rows } = await this.db.query(
      `SELECT
         ja.id AS application_id,
         ja.status AS application_status,
         ja.notes AS attendance_notes,
         wp.full_name AS worker_name,
         wp.id_verified,
         u.phone AS worker_phone,
         c.id AS contract_id,
         c.status AS contract_status,
         c.worker_signed_at,
         c.manager_signed_at,
         ar.id AS attendance_id,
         ar.status AS attendance_status,
         ar.check_in_time::TEXT AS check_in_time,
         ar.check_out_time::TEXT AS check_out_time,
         ar.hours_worked
       FROM app.job_applications ja
       JOIN app.worker_profiles wp ON ja.worker_id = wp.id
       JOIN auth.users u ON wp.user_id = u.id
       LEFT JOIN app.contracts c ON c.application_id = ja.id
       LEFT JOIN app.attendance_records ar
         ON ar.job_id = ja.job_id AND ar.worker_id = ja.worker_id
       WHERE ja.job_id = $1
       ORDER BY ja.applied_at ASC`,
      [jobId],
    );
    return { job, roster: rows };
  }

  async getWorkerUserIdByApplication(applicationId: string): Promise<string | null> {
    const { rows } = await this.db.query<{ user_id: string }>(
      `SELECT u.id AS user_id FROM app.job_applications ja
       JOIN app.worker_profiles wp ON ja.worker_id = wp.id
       JOIN auth.users u ON wp.user_id = u.id
       WHERE ja.id = $1`,
      [applicationId],
    );
    return rows[0]?.user_id ?? null;
  }

  async updateApplicationStatus(id: string, status: string, notes?: string) {
    const { rows } = await this.db.query(
      `UPDATE app.job_applications
       SET status = $2,
           notes = CASE WHEN $3::TEXT IS NOT NULL THEN $3 ELSE notes END,
           reviewed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, status, notes ?? null],
    );
    return rows[0];
  }

  async resetApplication(id: string) {
    const { rows } = await this.db.query(
      `UPDATE app.job_applications
       SET status = 'PENDING', notes = NULL, reviewed_at = NULL
       WHERE id = $1 RETURNING *`,
      [id],
    );
    return rows[0];
  }

  // ── Construction company management ─────────────────────────────────────────

  async findCompanies(search: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const param = `%${search}%`;
    const { rows } = await this.db.query(
      `SELECT cc.id, cc.name, cc.business_reg_no, cc.contact_name, cc.contact_phone, cc.contact_email,
              cc.signature_s3_key, cc.business_reg_cert_s3_key, cc.created_at,
              COUNT(cs.id) AS site_count
       FROM app.construction_companies cc
       LEFT JOIN app.construction_sites cs ON cs.company_id = cc.id
       WHERE ($1 = '' OR cc.name ILIKE $2 OR cc.business_reg_no ILIKE $2 OR cc.contact_name ILIKE $2)
       GROUP BY cc.id
       ORDER BY cc.created_at DESC
       LIMIT $3 OFFSET $4`,
      [search, param, limit, offset],
    );
    const { rows: countRows } = await this.db.query(
      `SELECT COUNT(*) AS total FROM app.construction_companies
       WHERE ($1 = '' OR name ILIKE $2 OR business_reg_no ILIKE $2 OR contact_name ILIKE $2)`,
      [search, param],
    );
    return {
      data: rows.map((r) => ({
        ...r,
        site_count: parseInt(r.site_count) || 0,
        signature_url: cdnUrl(r.signature_s3_key),
        business_reg_cert_url: cdnUrl(r.business_reg_cert_s3_key),
      })),
      total: parseInt(countRows[0].total) || 0,
    };
  }

  async findCompanyById(id: string) {
    const { rows } = await this.db.query(
      `SELECT cc.*, COUNT(cs.id) AS site_count
       FROM app.construction_companies cc
       LEFT JOIN app.construction_sites cs ON cs.company_id = cc.id
       WHERE cc.id = $1
       GROUP BY cc.id`,
      [id],
    );
    if (!rows[0]) return null;
    return {
      ...rows[0],
      site_count: parseInt(rows[0].site_count) || 0,
      signature_url: cdnUrl(rows[0].signature_s3_key),
      business_reg_cert_url: cdnUrl(rows[0].business_reg_cert_s3_key),
    };
  }

  async createCompany(data: Record<string, unknown>) {
    const { rows } = await this.db.query(
      `INSERT INTO app.construction_companies
         (name, business_reg_no, contact_name, contact_phone, contact_email, signature_s3_key, business_reg_cert_s3_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name, data.businessRegNo ?? null, data.contactName ?? null,
        data.contactPhone ?? null, data.contactEmail ?? null,
        data.signatureS3Key ?? null, data.businessRegCertS3Key ?? null,
      ],
    );
    return rows[0];
  }

  async updateCompany(id: string, data: Record<string, unknown>) {
    const { rows } = await this.db.query(
      `UPDATE app.construction_companies SET
         name                     = COALESCE($2, name),
         business_reg_no          = COALESCE($3, business_reg_no),
         contact_name             = COALESCE($4, contact_name),
         contact_phone            = COALESCE($5, contact_phone),
         contact_email            = COALESCE($6, contact_email),
         signature_s3_key         = COALESCE($7, signature_s3_key),
         business_reg_cert_s3_key = COALESCE($8, business_reg_cert_s3_key),
         updated_at               = NOW()
       WHERE id = $1 RETURNING *`,
      [
        id,
        data.name ?? null, data.businessRegNo ?? null, data.contactName ?? null,
        data.contactPhone ?? null, data.contactEmail ?? null,
        data.signatureS3Key ?? null, data.businessRegCertS3Key ?? null,
      ],
    );
    return rows[0] ?? null;
  }

  async updateCompanySealKey(id: string, key: string | null) {
    const { rows } = await this.db.query(
      `UPDATE app.construction_companies
       SET signature_s3_key = $2, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, key],
    );
    if (!rows[0]) return null;
    return {
      ...rows[0],
      site_count: 0,
      signature_url: cdnUrl(rows[0].signature_s3_key),
      business_reg_cert_url: cdnUrl(rows[0].business_reg_cert_s3_key),
    };
  }

  async deleteCompany(id: string) {
    const { rows } = await this.db.query(
      `DELETE FROM app.construction_companies WHERE id = $1 RETURNING id`,
      [id],
    );
    return rows[0] ?? null;
  }

  // ── Site management ─────────────────────────────────────────────────────────

  async findSites() {
    const { rows } = await this.db.query(
      `SELECT cs.id, cs.name, cs.address, cs.province, cs.district, cs.status, cs.site_type, cs.created_at,
              cs.company_id,
              cc.name AS company_name,
              mp.representative_name AS manager_name,
              u.phone AS manager_phone,
              COUNT(DISTINCT j.id) AS job_count,
              COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'OPEN') AS open_job_count
       FROM app.construction_sites cs
       LEFT JOIN app.construction_companies cc ON cs.company_id = cc.id
       LEFT JOIN app.manager_profiles mp ON cs.manager_id = mp.id
       LEFT JOIN auth.users u ON mp.user_id = u.id
       LEFT JOIN app.jobs j ON j.site_id = cs.id
       GROUP BY cs.id, cc.name, mp.representative_name, u.phone
       ORDER BY cs.created_at DESC`,
    );
    return rows.map((r) => ({
      ...r,
      job_count: parseInt(r.job_count) || 0,
      open_job_count: parseInt(r.open_job_count) || 0,
    }));
  }

  async findSiteById(id: string) {
    const { rows } = await this.db.query(
      `SELECT cs.*, cs.company_id,
              cc.name AS company_name, cc.contact_name AS company_contact_name,
              cc.contact_phone AS company_contact_phone, cc.signature_s3_key AS company_signature_s3_key,
              mp.representative_name AS manager_name, u.phone AS manager_phone, mp.id AS manager_profile_id
       FROM app.construction_sites cs
       LEFT JOIN app.construction_companies cc ON cs.company_id = cc.id
       LEFT JOIN app.manager_profiles mp ON cs.manager_id = mp.id
       LEFT JOIN auth.users u ON mp.user_id = u.id
       WHERE cs.id = $1`,
      [id],
    );
    if (!rows[0]) return null;
    const { rows: jobRows } = await this.db.query(
      `SELECT j.id, j.title, j.status, j.work_date, j.daily_wage, j.slots_total, j.slots_filled,
              COUNT(a.id) AS application_count,
              COUNT(a.id) FILTER (WHERE a.status IN ('ACCEPTED','CONTRACTED')) AS hired_count
       FROM app.jobs j
       LEFT JOIN app.job_applications a ON a.job_id = j.id
       WHERE j.site_id = $1
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      [id],
    );
    return {
      ...rows[0],
      jobs: jobRows.map((j) => ({
        ...j,
        application_count: parseInt(j.application_count) || 0,
        hired_count: parseInt(j.hired_count) || 0,
      })),
    };
  }

  async createSite(data: Record<string, unknown>) {
    const { rows } = await this.db.query(
      `INSERT INTO app.construction_sites (manager_id, company_id, name, address, province, district, site_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'ACTIVE'))
       RETURNING *`,
      [
        data.managerId, data.companyId ?? null,
        data.name, data.address, data.province,
        data.district ?? null, data.siteType ?? null, data.status ?? null,
      ],
    );
    return rows[0];
  }

  async updateSite(id: string, data: Record<string, unknown>) {
    const { rows } = await this.db.query(
      `UPDATE app.construction_sites SET
         name       = COALESCE($2, name),
         address    = COALESCE($3, address),
         province   = COALESCE($4, province),
         district   = COALESCE($5, district),
         site_type  = COALESCE($6, site_type),
         status     = COALESCE($7, status),
         company_id = COALESCE($8, company_id),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [
        id,
        data.name ?? null, data.address ?? null, data.province ?? null,
        data.district ?? null, data.siteType ?? null, data.status ?? null,
        data.companyId ?? null,
      ],
    );
    return rows[0];
  }

  async deleteSite(id: string) {
    // Try hard delete first; if constraints exist, soft delete to COMPLETED
    try {
      const { rows } = await this.db.query(
        `DELETE FROM app.construction_sites WHERE id = $1 RETURNING id`,
        [id],
      );
      return rows[0] ?? null;
    } catch {
      const { rows } = await this.db.query(
        `UPDATE app.construction_sites SET status = 'COMPLETED', updated_at = NOW()
         WHERE id = $1 RETURNING id`,
        [id],
      );
      return rows[0] ?? null;
    }
  }

  // ── Worker CRUD ─────────────────────────────────────────────────────────────

  async createWorkerProfile(firebaseUid: string, phone: string, fullName: string) {
    const { rows: userRows } = await this.db.query<{ id: string }>(
      `INSERT INTO auth.users (firebase_uid, phone, role)
       VALUES ($1, $2, 'WORKER')
       ON CONFLICT (firebase_uid) DO UPDATE SET phone = EXCLUDED.phone, updated_at = NOW()
       RETURNING id`,
      [firebaseUid, phone],
    );
    const userId = userRows[0].id;
    const { rows } = await this.db.query(
      `INSERT INTO app.worker_profiles (user_id, full_name)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW()
       RETURNING *`,
      [userId, fullName],
    );
    return rows[0];
  }

  async deleteWorkerProfile(id: string) {
    const { rows } = await this.db.query(
      `UPDATE auth.users u SET status = 'SUSPENDED', updated_at = NOW()
       FROM app.worker_profiles wp
       WHERE wp.id = $1 AND wp.user_id = u.id
       RETURNING u.id`,
      [id],
    );
    return rows[0] ?? null;
  }

  // ── Admin user management ────────────────────────────────────────────────────

  async findAllAdminUsers() {
    const { rows } = await this.db.query(
      `SELECT id, email, name, role, permissions, status, invited_by, created_at, last_login_at
       FROM ops.admin_users
       ORDER BY created_at ASC`,
    );
    return rows;
  }

  async findAdminUserByEmail(email: string) {
    const { rows } = await this.db.query(
      `SELECT id, email, name, role, permissions, status, password_hash, created_at, last_login_at
       FROM ops.admin_users WHERE email = $1`,
      [email],
    );
    return rows[0] ?? null;
  }

  async findAdminUserByToken(token: string) {
    const { rows } = await this.db.query(
      `SELECT id, email, name, role, permissions, status, invite_expires_at
       FROM ops.admin_users
       WHERE invite_token = $1 AND status = 'INVITED' AND invite_expires_at > NOW()`,
      [token],
    );
    return rows[0] ?? null;
  }

  async createAdminUser(data: {
    email: string;
    name?: string;
    role: string;
    permissions: Record<string, boolean>;
    inviteToken: string;
    invitedBy?: string;
  }) {
    const { rows } = await this.db.query(
      `INSERT INTO ops.admin_users (email, name, role, permissions, status, invite_token, invite_expires_at, invited_by)
       VALUES ($1, $2, $3, $4, 'INVITED', $5, NOW() + INTERVAL '7 days', $6)
       RETURNING id, email, name, role, permissions, status, invite_token`,
      [
        data.email, data.name ?? null, data.role,
        JSON.stringify(data.permissions),
        data.inviteToken, data.invitedBy ?? null,
      ],
    );
    return rows[0];
  }

  async acceptInvite(token: string, passwordHash: string, name?: string) {
    const { rows } = await this.db.query(
      `UPDATE ops.admin_users
       SET password_hash = $2, name = COALESCE($3, name),
           status = 'ACTIVE', invite_token = NULL, invite_expires_at = NULL,
           last_login_at = NOW()
       WHERE invite_token = $1 AND status = 'INVITED' AND invite_expires_at > NOW()
       RETURNING id, email, name, role, permissions, status`,
      [token, passwordHash, name ?? null],
    );
    return rows[0] ?? null;
  }

  async updateAdminUserPermissions(id: string, permissions: Record<string, boolean>) {
    const { rows } = await this.db.query(
      `UPDATE ops.admin_users SET permissions = $2 WHERE id = $1
       RETURNING id, email, name, role, permissions, status`,
      [id, JSON.stringify(permissions)],
    );
    return rows[0] ?? null;
  }

  async updateAdminUserRole(id: string, role: string) {
    const { rows } = await this.db.query(
      `UPDATE ops.admin_users SET role = $2 WHERE id = $1
       RETURNING id, email, name, role, permissions, status`,
      [id, role],
    );
    return rows[0] ?? null;
  }

  async updateAdminUserPassword(id: string, passwordHash: string) {
    const { rows } = await this.db.query(
      `UPDATE ops.admin_users SET password_hash = $2 WHERE id = $1 RETURNING id`,
      [id, passwordHash],
    );
    return rows[0] ?? null;
  }

  async updateAdminUserStatus(id: string, status: string) {
    const { rows } = await this.db.query(
      `UPDATE ops.admin_users SET status = $2 WHERE id = $1
       RETURNING id, email, name, role, permissions, status`,
      [id, status],
    );
    return rows[0] ?? null;
  }

  async updateAdminUserLastLogin(email: string) {
    await this.db.query(
      `UPDATE ops.admin_users SET last_login_at = NOW() WHERE email = $1`,
      [email],
    );
  }

  async updateAdminUserName(id: string, name: string) {
    const { rows } = await this.db.query(
      `UPDATE ops.admin_users SET name = $2 WHERE id = $1 RETURNING id, email, name, role, permissions, status`,
      [id, name],
    );
    return rows[0] ?? null;
  }

  async updateAdminUserReinvite(id: string, token: string) {
    const { rows } = await this.db.query(
      `UPDATE ops.admin_users
       SET invite_token = $2, invite_expires_at = NOW() + INTERVAL '7 days', status = 'INVITED', password_hash = NULL
       WHERE id = $1
       RETURNING id, email, name, role, permissions, status, invite_token`,
      [id, token],
    );
    return rows[0] ?? null;
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
