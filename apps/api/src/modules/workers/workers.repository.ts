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
    const { rows } = await this.db.query(
      `INSERT INTO app.worker_profiles (user_id, full_name, date_of_birth, experience_months)
       VALUES ($1, $2, '1990-01-01', COALESCE($3, 0))
       ON CONFLICT (user_id) DO UPDATE
         SET full_name = COALESCE($2, app.worker_profiles.full_name),
             experience_months = COALESCE($3, app.worker_profiles.experience_months),
             updated_at = NOW()
       RETURNING *`,
      [userId, data.fullName, data.experienceMonths],
    );
    return rows[0];
  }
}
