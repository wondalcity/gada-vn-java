import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

const CDN = process.env.CLOUDFRONT_URL ?? '';
function cdnUrl(key: string | null): string | null {
  if (!key) return null;
  return CDN ? `${CDN}/${key}` : key;
}

@Injectable()
export class WorkersRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByUserId(userId: string) {
    const { rows } = await this.db.query(
      `SELECT
         wp.*,
         u.phone, u.email,
         t.name_ko AS trade_name_ko, t.name_vi AS trade_name_vi
       FROM app.worker_profiles wp
       JOIN auth.users u ON u.id = wp.user_id
       LEFT JOIN ref.construction_trades t ON wp.primary_trade_id = t.id
       WHERE wp.user_id = $1`,
      [userId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      ...row,
      profile_image_url: cdnUrl(row.profile_picture_s3_key),
      id_front_url: cdnUrl(row.id_front_s3_key),
      id_back_url: cdnUrl(row.id_back_s3_key),
      signature_url: cdnUrl(row.signature_s3_key),
      bank_book_url: cdnUrl(row.bank_book_s3_key),
    };
  }

  async findHiresByUserId(userId: string) {
    const { rows } = await this.db.query(
      `SELECT
         a.id, a.job_id AS "jobId", j.title AS "jobTitle",
         j.site_id AS "siteId", cs.name AS "siteName",
         j.work_date AS "workDate", j.start_time AS "startTime", j.end_time AS "endTime",
         j.daily_wage AS "dailyWage", a.status,
         a.applied_at AS "appliedAt", a.reviewed_at AS "reviewedAt",
         mp.company_name AS "managerName", c.id AS "contractId"
       FROM app.job_applications a
       JOIN app.jobs j ON j.id = a.job_id
       JOIN app.construction_sites cs ON cs.id = j.site_id
       LEFT JOIN app.manager_profiles mp ON mp.user_id = a.reviewed_by
       LEFT JOIN app.contracts c ON c.application_id = a.id
       WHERE a.worker_id = $1
         AND a.status IN ('ACCEPTED', 'CONTRACTED')
       ORDER BY a.reviewed_at DESC NULLS LAST`,
      [userId],
    );
    return rows;
  }

  async findAttendanceByUserId(userId: string, jobId?: string) {
    const params: unknown[] = [userId];
    const jobFilter = jobId ? `AND ar.job_id = $2` : '';
    if (jobId) params.push(jobId);
    const { rows } = await this.db.query(
      `SELECT
         ar.id, ar.job_id AS "jobId", j.title AS "jobTitle",
         cs.name AS "siteName", ar.work_date AS "workDate",
         ar.status, ar.check_in_time AS "checkInTime",
         ar.check_out_time AS "checkOutTime",
         ar.hours_worked AS "hoursWorked", ar.notes
       FROM app.attendance_records ar
       JOIN app.jobs j ON j.id = ar.job_id
       JOIN app.construction_sites cs ON cs.id = j.site_id
       WHERE ar.worker_id = $1 ${jobFilter}
       ORDER BY ar.work_date DESC`,
      params,
    );
    return rows;
  }

  async updateByUserId(userId: string, data: Record<string, unknown>) {
    // Build SET clauses dynamically — only update provided fields
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [userId];

    function addField(column: string, value: unknown) {
      params.push(value);
      setClauses.push(`${column} = $${params.length}`);
    }

    if (data.fullName !== undefined)           addField('full_name', data.fullName || null);
    if (data.dateOfBirth !== undefined)        addField('date_of_birth', data.dateOfBirth || null);
    if (data.gender !== undefined)             addField('gender', data.gender || null);
    if (data.bio !== undefined)                addField('bio', data.bio || null);
    if (data.experienceMonths !== undefined)   addField('experience_months', data.experienceMonths ?? 0);
    if (data.primaryTradeId !== undefined)     addField('primary_trade_id', data.primaryTradeId || null);
    if (data.currentProvince !== undefined)    addField('current_province', data.currentProvince || null);
    if (data.currentDistrict !== undefined)    addField('current_district', data.currentDistrict || null);
    if (data.lat !== undefined)                addField('lat', data.lat ?? null);
    if (data.lng !== undefined)                addField('lng', data.lng ?? null);
    if (data.idNumber !== undefined)           addField('id_number', data.idNumber || null);
    if (data.idFrontS3Key !== undefined)       addField('id_front_s3_key', data.idFrontS3Key || null);
    if (data.idBackS3Key !== undefined)        addField('id_back_s3_key', data.idBackS3Key || null);
    if (data.signatureS3Key !== undefined)     addField('signature_s3_key', data.signatureS3Key || null);
    if (data.profilePictureS3Key !== undefined) addField('profile_picture_s3_key', data.profilePictureS3Key || null);
    if (data.bankName !== undefined)           addField('bank_name', data.bankName || null);
    if (data.bankAccountNumber !== undefined)  addField('bank_account_number', data.bankAccountNumber || null);
    if (data.bankBookS3Key !== undefined)      addField('bank_book_s3_key', data.bankBookS3Key || null);

    if (setClauses.length === 1) {
      // Nothing to update except timestamp — return existing profile
      return this.findByUserId(userId);
    }

    const { rows } = await this.db.query(
      `UPDATE app.worker_profiles
       SET ${setClauses.join(', ')}
       WHERE user_id = $1
       RETURNING *`,
      params,
    );

    if (rows[0]) return rows[0];

    // Profile doesn't exist yet — create minimal row then apply all SET clauses
    await this.db.query(
      `INSERT INTO app.worker_profiles (user_id, full_name, date_of_birth, experience_months)
       VALUES ($1, '', '1990-01-01'::date, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
    const { rows: updated } = await this.db.query(
      `UPDATE app.worker_profiles
       SET ${setClauses.join(', ')}
       WHERE user_id = $1
       RETURNING *`,
      params,
    );
    return updated[0] ?? null;
  }

  // ── Trade skills ─────────────────────────────────────────────────────────

  async findTradeSkillsByUserId(userId: string) {
    const { rows } = await this.db.query(
      `SELECT wts.trade_id, wts.years, t.name_ko, t.name_vi, t.code
       FROM app.worker_trade_skills wts
       JOIN app.worker_profiles wp ON wp.id = wts.worker_id
       JOIN ref.construction_trades t ON t.id = wts.trade_id
       WHERE wp.user_id = $1
       ORDER BY wts.years DESC`,
      [userId],
    );
    return rows;
  }

  // ── Saved locations ──────────────────────────────────────────────────────

  async findSavedLocationsByUserId(userId: string) {
    const { rows } = await this.db.query(
      `SELECT wsl.id, wsl.label, wsl.address, wsl.lat, wsl.lng, wsl.is_default
       FROM app.worker_saved_locations wsl
       JOIN app.worker_profiles wp ON wp.id = wsl.worker_id
       WHERE wp.user_id = $1
       ORDER BY wsl.is_default DESC, wsl.created_at ASC`,
      [userId],
    );
    return rows;
  }

  async upsertSavedLocation(
    userId: string,
    data: { label: string; address?: string | null; lat: number; lng: number; isDefault?: boolean },
  ) {
    return this.db.transaction(async (client) => {
      const { rows: wpRows } = await client.query(
        'SELECT id FROM app.worker_profiles WHERE user_id = $1',
        [userId],
      );
      if (!wpRows[0]) throw new Error('Worker profile not found');
      const workerId = wpRows[0].id;

      // If setting as default, clear existing default first
      if (data.isDefault) {
        await client.query(
          'UPDATE app.worker_saved_locations SET is_default = FALSE WHERE worker_id = $1',
          [workerId],
        );
      }

      const { rows } = await client.query(
        `INSERT INTO app.worker_saved_locations (worker_id, label, address, lat, lng, is_default)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (worker_id, label)
         DO UPDATE SET address = EXCLUDED.address, lat = EXCLUDED.lat,
                       lng = EXCLUDED.lng, is_default = EXCLUDED.is_default
         RETURNING id, label, address, lat, lng, is_default`,
        [workerId, data.label, data.address ?? null, data.lat, data.lng, data.isDefault ?? false],
      );
      return rows[0];
    });
  }

  async deleteSavedLocation(userId: string, locationId: string) {
    const { rowCount } = await this.db.query(
      `DELETE FROM app.worker_saved_locations wsl
       USING app.worker_profiles wp
       WHERE wsl.id = $1 AND wsl.worker_id = wp.id AND wp.user_id = $2`,
      [locationId, userId],
    );
    return (rowCount ?? 0) > 0;
  }

  // ── Experiences ──────────────────────────────────────────────────────────

  async findExperiencesByUserId(userId: string) {
    const { rows } = await this.db.query(
      `SELECT we.id, we.company_name AS "companyName", we.role,
              we.start_date AS "startDate", we.end_date AS "endDate",
              we.description
       FROM app.worker_experiences we
       JOIN app.worker_profiles wp ON wp.id = we.worker_id
       WHERE wp.user_id = $1
       ORDER BY we.start_date DESC`,
      [userId],
    );
    return rows;
  }

  async createExperience(
    userId: string,
    data: { companyName: string; role: string; startDate: string; endDate?: string | null; description?: string | null },
  ) {
    const { rows: wpRows } = await this.db.query(
      'SELECT id FROM app.worker_profiles WHERE user_id = $1',
      [userId],
    );
    if (!wpRows[0]) throw new Error('Worker profile not found');
    const workerId = wpRows[0].id;

    const { rows } = await this.db.query(
      `INSERT INTO app.worker_experiences (worker_id, company_name, role, start_date, end_date, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, company_name AS "companyName", role,
                 start_date AS "startDate", end_date AS "endDate", description`,
      [workerId, data.companyName, data.role, data.startDate, data.endDate ?? null, data.description ?? null],
    );
    return rows[0];
  }

  async updateExperience(
    userId: string,
    experienceId: string,
    data: { companyName?: string; role?: string; startDate?: string; endDate?: string | null; description?: string | null },
  ) {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [experienceId, userId];

    function add(col: string, val: unknown) {
      params.push(val);
      setClauses.push(`${col} = $${params.length}`);
    }

    if (data.companyName !== undefined) add('company_name', data.companyName);
    if (data.role !== undefined)        add('role', data.role);
    if (data.startDate !== undefined)   add('start_date', data.startDate);
    if (data.endDate !== undefined)     add('end_date', data.endDate ?? null);
    if (data.description !== undefined) add('description', data.description ?? null);

    const { rows } = await this.db.query(
      `UPDATE app.worker_experiences we
       SET ${setClauses.join(', ')}
       FROM app.worker_profiles wp
       WHERE we.id = $1 AND we.worker_id = wp.id AND wp.user_id = $2
       RETURNING we.id, we.company_name AS "companyName", we.role,
                 we.start_date AS "startDate", we.end_date AS "endDate", we.description`,
      params,
    );
    return rows[0] ?? null;
  }

  async deleteExperience(userId: string, experienceId: string) {
    const { rowCount } = await this.db.query(
      `DELETE FROM app.worker_experiences we
       USING app.worker_profiles wp
       WHERE we.id = $1 AND we.worker_id = wp.id AND wp.user_id = $2`,
      [experienceId, userId],
    );
    return (rowCount ?? 0) > 0;
  }

  async replaceTradeSkillsByUserId(
    userId: string,
    skills: { tradeId: number; years: number }[],
  ) {
    return this.db.transaction(async (client) => {
      // Get the worker profile id
      const { rows: wpRows } = await client.query(
        'SELECT id FROM app.worker_profiles WHERE user_id = $1',
        [userId],
      );
      if (!wpRows[0]) throw new Error('Worker profile not found');
      const workerId = wpRows[0].id;

      // Delete all existing skills
      await client.query(
        'DELETE FROM app.worker_trade_skills WHERE worker_id = $1',
        [workerId],
      );

      // Insert new skills
      if (skills.length > 0) {
        const values = skills
          .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
          .join(', ');
        const params: unknown[] = [workerId];
        for (const s of skills) {
          params.push(s.tradeId, s.years);
        }
        await client.query(
          `INSERT INTO app.worker_trade_skills (worker_id, trade_id, years) VALUES ${values}
           ON CONFLICT (worker_id, trade_id) DO UPDATE SET years = EXCLUDED.years`,
          params,
        );
      }

      // Update primary_trade_id and experience_months from top skill
      if (skills.length > 0) {
        const top = skills.reduce((a, b) => (b.years > a.years ? b : a));
        await client.query(
          `UPDATE app.worker_profiles
           SET primary_trade_id = $2, experience_months = $3, updated_at = NOW()
           WHERE user_id = $1`,
          [userId, top.tradeId, top.years * 12],
        );
      }

      return this.findTradeSkillsByUserId(userId);
    });
  }
}
