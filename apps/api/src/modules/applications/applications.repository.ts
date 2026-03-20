import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByWorkerAndJob(userId: string, jobId: string) {
    const { rows } = await this.db.query(
      `SELECT a.* FROM app.applications a
       JOIN app.worker_profiles wp ON a.worker_id = wp.id
       WHERE wp.user_id = $1 AND a.job_id = $2`,
      [userId, jobId],
    );
    return rows[0] || null;
  }

  async findById(id: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM app.applications WHERE id = $1',
      [id],
    );
    return rows[0] || null;
  }

  async findByWorkerUserId(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const { rows } = await this.db.query(
      `SELECT a.*, j.title as job_title, j.work_date, j.daily_wage,
              s.name as site_name, s.address
       FROM app.applications a
       JOIN app.worker_profiles wp ON a.worker_id = wp.id
       JOIN app.jobs j ON a.job_id = j.id
       JOIN app.construction_sites s ON j.site_id = s.id
       WHERE wp.user_id = $1
       ORDER BY a.applied_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return rows;
  }

  async findByJobId(jobId: string, managerUserId: string) {
    const { rows } = await this.db.query(
      `SELECT a.*, wp.full_name as worker_name, wp.rating as worker_rating,
              wp.completed_jobs
       FROM app.applications a
       JOIN app.worker_profiles wp ON a.worker_id = wp.id
       JOIN app.jobs j ON a.job_id = j.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE a.job_id = $1 AND mp.user_id = $2
       ORDER BY wp.rating DESC`,
      [jobId, managerUserId],
    );
    return rows;
  }

  async create(userId: string, jobId: string, _data: Record<string, unknown>) {
    const { rows } = await this.db.query(
      `INSERT INTO app.applications (worker_id, job_id, status, applied_at)
       SELECT wp.id, $2, 'PENDING', NOW()
       FROM app.worker_profiles wp WHERE wp.user_id = $1
       RETURNING *`,
      [userId, jobId],
    );
    return rows[0];
  }

  async updateStatus(id: string, managerUserId: string, status: string) {
    const { rows } = await this.db.query(
      `UPDATE app.applications a
       SET status = $2, reviewed_at = NOW()
       FROM app.jobs j
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE a.id = $1
         AND a.job_id = j.id
         AND mp.user_id = $3
       RETURNING a.*`,
      [id, status, managerUserId],
    );
    return rows[0];
  }
}
