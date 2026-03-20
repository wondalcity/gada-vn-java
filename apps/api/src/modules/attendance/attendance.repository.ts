import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AttendanceRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByJobId(jobId: string, managerUserId: string) {
    const { rows } = await this.db.query(
      `SELECT ar.*, wp.full_name as worker_name, wp.id as worker_profile_id
       FROM app.attendance_records ar
       JOIN app.worker_profiles wp ON ar.worker_id = wp.id
       JOIN app.jobs j ON ar.job_id = j.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE ar.job_id = $1 AND mp.user_id = $2
       ORDER BY wp.full_name ASC`,
      [jobId, managerUserId],
    );
    return rows;
  }

  async findById(id: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM app.attendance_records WHERE id = $1',
      [id],
    );
    return rows[0] || null;
  }

  // Returns worker user_id for FCM notification
  async findWorkerUserIdByRecord(id: string): Promise<string | null> {
    const { rows } = await this.db.query<{ user_id: string }>(
      `SELECT u.id as user_id FROM app.attendance_records ar
       JOIN app.worker_profiles wp ON ar.worker_id = wp.id
       JOIN auth.users u ON wp.user_id = u.id
       WHERE ar.id = $1`,
      [id],
    );
    return rows[0]?.user_id ?? null;
  }

  async update(
    id: string,
    managerUserId: string,
    data: { status: string; notes?: string },
  ) {
    const { rows } = await this.db.query(
      `UPDATE app.attendance_records ar
       SET status = $2, notes = COALESCE($3, ar.notes),
           marked_at = NOW()
       FROM app.jobs j
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE ar.id = $1 AND ar.job_id = j.id AND mp.user_id = $4
       RETURNING ar.*, mp.id as marked_by_id`,
      [id, data.status, data.notes ?? null, managerUserId],
    );
    return rows[0];
  }

  async bulkUpsert(
    jobId: string,
    managerUserId: string,
    records: Array<{ workerId: string; workDate: string; status: string; notes?: string }>,
  ) {
    return this.db.transaction(async (client) => {
      // Verify manager owns the job and get manager profile id
      const { rows: jobRows } = await client.query<{ manager_id: string }>(
        `SELECT j.manager_id FROM app.jobs j
         JOIN app.manager_profiles mp ON j.manager_id = mp.id
         WHERE j.id = $1 AND mp.user_id = $2`,
        [jobId, managerUserId],
      );
      if (jobRows.length === 0) throw new Error('Job not found or unauthorized');
      const managerId = jobRows[0].manager_id;

      const results = [];
      for (const record of records) {
        const { rows } = await client.query(
          `INSERT INTO app.attendance_records (job_id, worker_id, work_date, status, notes, marked_by, marked_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (job_id, worker_id, work_date)
           DO UPDATE SET
             status = $4,
             notes = COALESCE($5, app.attendance_records.notes),
             marked_by = $6,
             marked_at = NOW()
           RETURNING *`,
          [jobId, record.workerId, record.workDate, record.status, record.notes ?? null, managerId],
        );
        results.push(rows[0]);
      }
      return results;
    });
  }
}
