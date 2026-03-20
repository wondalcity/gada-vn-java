import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class ContractsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findAcceptedApplication(applicationId: string, managerUserId: string) {
    const { rows } = await this.db.query(
      `SELECT a.*, j.id as job_id, j.title as job_title, j.work_date,
              j.daily_wage, j.start_time, j.end_time,
              mp.id as manager_profile_id,
              wp.id as worker_profile_id, wp.full_name as worker_name
       FROM app.job_applications a
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
       JOIN app.manager_profiles mp ON c.manager_id = mp.id
       JOIN app.worker_profiles wp ON c.worker_id = wp.id
       WHERE c.id = $1 AND (mp.user_id = $2 OR wp.user_id = $2)`,
      [contractId, userId],
    );
    return parseInt(rows[0]?.count ?? '0') > 0;
  }

  async isWorkerPartyToContract(contractId: string, workerUserId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM app.contracts c
       JOIN app.worker_profiles wp ON c.worker_id = wp.id
       WHERE c.id = $1 AND wp.user_id = $2`,
      [contractId, workerUserId],
    );
    return parseInt(rows[0]?.count ?? '0') > 0;
  }

  async create(data: {
    applicationId: string;
    jobId: string;
    workerId: string;
    managerId: string;
    contractHtml: string;
  }) {
    const { rows } = await this.db.query(
      `INSERT INTO app.contracts
         (application_id, job_id, worker_id, manager_id, contract_html, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING_WORKER_SIGN')
       RETURNING *`,
      [data.applicationId, data.jobId, data.workerId, data.managerId, data.contractHtml],
    );
    return rows[0];
  }

  async sign(contractId: string, workerUserId: string, signatureS3Key: string) {
    const { rows } = await this.db.query(
      `UPDATE app.contracts c
       SET worker_signature_s3_key = $2,
           worker_signed_at = NOW(),
           status = 'FULLY_SIGNED',
           updated_at = NOW()
       FROM app.worker_profiles wp
       WHERE c.id = $1 AND c.worker_id = wp.id AND wp.user_id = $3
       RETURNING c.*`,
      [contractId, signatureS3Key, workerUserId],
    );
    return rows[0];
  }
}
