import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AttendanceRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByJobId(jobId: string, managerUserId: string) {
    const { rows } = await this.db.query(
      `SELECT at.*, wp.full_name as worker_name, wp.id as worker_profile_id
       FROM app.attendance at
       JOIN app.worker_profiles wp ON at.worker_id = wp.id
       JOIN app.jobs j ON at.job_id = j.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE at.job_id = $1 AND mp.user_id = $2
       ORDER BY wp.full_name ASC`,
      [jobId, managerUserId],
    );
    return rows;
  }

  async findById(id: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM app.attendance WHERE id = $1',
      [id],
    );
    return rows[0] || null;
  }

  async update(
    id: string,
    managerUserId: string,
    data: { status: string; note?: string },
  ) {
    const { rows } = await this.db.query(
      `UPDATE app.attendance at
       SET status = $2, note = COALESCE($3, at.note), updated_at = NOW()
       FROM app.jobs j
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE at.id = $1 AND at.job_id = j.id AND mp.user_id = $4
       RETURNING at.*`,
      [id, data.status, data.note || null, managerUserId],
    );
    return rows[0];
  }

  async bulkUpsert(
    jobId: string,
    managerUserId: string,
    records: Array<{ workerId: string; status: string; note?: string }>,
  ) {
    return this.db.transaction(async (client) => {
      // Verify manager owns the job
      const { rows: jobRows } = await client.query(
        `SELECT j.id FROM app.jobs j
         JOIN app.manager_profiles mp ON j.manager_id = mp.id
         WHERE j.id = $1 AND mp.user_id = $2`,
        [jobId, managerUserId],
      );
      if (jobRows.length === 0) throw new Error('Job not found or unauthorized');

      const results = [];
      for (const record of records) {
        const { rows } = await client.query(
          `INSERT INTO app.attendance (job_id, worker_id, status, note)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (job_id, worker_id)
           DO UPDATE SET status = $3, note = COALESCE($4, app.attendance.note), updated_at = NOW()
           RETURNING *`,
          [jobId, record.workerId, record.status, record.note || null],
        );
        results.push(rows[0]);
      }
      return results;
    });
  }
}
