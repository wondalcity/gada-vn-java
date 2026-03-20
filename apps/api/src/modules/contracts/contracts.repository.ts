import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class ContractsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findApplicationWithJob(applicationId: string, managerUserId: string) {
    const { rows } = await this.db.query(
      `SELECT a.*, j.title as job_title, j.work_date, j.daily_wage,
              j.start_time, j.end_time, j.site_id,
              wp.full_name as worker_name, wp.id as worker_profile_id
       FROM app.applications a
       JOIN app.jobs j ON a.job_id = j.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       JOIN app.worker_profiles wp ON a.worker_id = wp.id
       WHERE a.id = $1 AND mp.user_id = $2 AND a.status = 'ACCEPTED'`,
      [applicationId, managerUserId],
    );
    return rows[0] || null;
  }

  async findById(id: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM app.contracts WHERE id = $1',
      [id],
    );
    return rows[0] || null;
  }

  async isUserPartyToContract(contractId: string, userId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM app.contracts c
       JOIN app.applications a ON c.application_id = a.id
       JOIN app.jobs j ON a.job_id = j.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       JOIN app.worker_profiles wp ON a.worker_id = wp.id
       WHERE c.id = $1 AND (mp.user_id = $2 OR wp.user_id = $2)`,
      [contractId, userId],
    );
    return parseInt(rows[0]?.count ?? '0') > 0;
  }

  async isWorkerPartyToContract(contractId: string, workerUserId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM app.contracts c
       JOIN app.applications a ON c.application_id = a.id
       JOIN app.worker_profiles wp ON a.worker_id = wp.id
       WHERE c.id = $1 AND wp.user_id = $2`,
      [contractId, workerUserId],
    );
    return parseInt(rows[0]?.count ?? '0') > 0;
  }

  async create(applicationId: string, applicationData: Record<string, unknown>) {
    const { rows } = await this.db.query(
      `INSERT INTO app.contracts
         (application_id, status, job_title, work_date, daily_wage,
          start_time, end_time, worker_name, generated_at)
       VALUES ($1, 'PENDING_SIGNATURE', $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        applicationId,
        applicationData.job_title,
        applicationData.work_date,
        applicationData.daily_wage,
        applicationData.start_time,
        applicationData.end_time,
        applicationData.worker_name,
      ],
    );
    return rows[0];
  }

  async sign(id: string, _workerUserId: string, signatureData?: string) {
    const { rows } = await this.db.query(
      `UPDATE app.contracts
       SET status = 'SIGNED', signature_data = $2, signed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, signatureData || null],
    );
    return rows[0];
  }
}
