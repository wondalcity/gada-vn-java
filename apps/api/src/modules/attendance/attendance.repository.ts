import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AttendanceRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByJobId(jobId: string, managerUserId: string) {
    const { rows } = await this.db.query(
      `SELECT ar.*,
              wp.full_name   AS worker_name,
              wp.id          AS worker_profile_id
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

  // Returns worker user_id for authorization + FCM notifications
  async findWorkerUserIdByRecord(id: string): Promise<string | null> {
    const { rows } = await this.db.query<{ user_id: string }>(
      `SELECT u.id AS user_id
       FROM app.attendance_records ar
       JOIN app.worker_profiles wp ON ar.worker_id = wp.id
       JOIN app.users u ON wp.user_id = u.id
       WHERE ar.id = $1`,
      [id],
    );
    return rows[0]?.user_id ?? null;
  }

  // Checks whether userId is the manager who owns the job for this record
  async isManagerOfRecord(id: string, userId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ found: boolean }>(
      `SELECT TRUE AS found
       FROM app.attendance_records ar
       JOIN app.jobs j ON ar.job_id = j.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE ar.id = $1 AND mp.user_id = $2`,
      [id, userId],
    );
    return rows.length > 0;
  }

  async updateManagerStatus(
    id: string,
    managerUserId: string,
    data: { status: string; notes?: string },
  ) {
    const { rows } = await this.db.query(
      `UPDATE app.attendance_records ar
       SET status            = $2,
           notes             = COALESCE($3, ar.notes),
           marked_at         = NOW(),
           manager_status_at = NOW()
       FROM app.jobs j
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE ar.id = $1 AND ar.job_id = j.id AND mp.user_id = $4
       RETURNING ar.*`,
      [id, data.status, data.notes ?? null, managerUserId],
    );
    return rows[0];
  }

  async updateWorkerStatus(id: string, status: 'ATTENDED' | 'ABSENT' | 'EARLY_LEAVE') {
    const { rows } = await this.db.query(
      `UPDATE app.attendance_records
       SET worker_status    = $2,
           worker_status_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status],
    );
    return rows[0];
  }

  async setWorkDuration(
    id: string,
    hours: number,
    minutes: number,
    setBy: 'WORKER' | 'MANAGER',
  ) {
    const { rows } = await this.db.query(
      `UPDATE app.attendance_records
       SET work_hours              = $2,
           work_minutes            = $3,
           work_duration_set_by    = $4,
           work_duration_confirmed = FALSE,
           work_duration_confirmed_at = NULL
       WHERE id = $1
       RETURNING *`,
      [id, hours, minutes, setBy],
    );
    return rows[0];
  }

  async confirmWorkDuration(id: string) {
    const { rows } = await this.db.query(
      `UPDATE app.attendance_records
       SET work_duration_confirmed     = TRUE,
           work_duration_confirmed_at  = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    return rows[0];
  }

  async bulkUpsert(
    jobId: string,
    managerUserId: string,
    records: Array<{ workerId: string; workDate: string; status: string; notes?: string }>,
  ) {
    return this.db.transaction(async (client) => {
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
          `INSERT INTO app.attendance_records
             (job_id, worker_id, work_date, status, notes, marked_by, marked_at, manager_status_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           ON CONFLICT (job_id, worker_id, work_date) DO UPDATE SET
             status            = $4,
             notes             = COALESCE($5, app.attendance_records.notes),
             marked_by         = $6,
             marked_at         = NOW(),
             manager_status_at = NOW()
           RETURNING *`,
          [jobId, record.workerId, record.workDate, record.status, record.notes ?? null, managerId],
        );
        results.push(rows[0]);
      }
      return results;
    });
  }

  // ── Admin queries ──────────────────────────────────────────────────────────

  async adminList(filters: {
    jobId?: string;
    workDate?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.jobId) {
      params.push(filters.jobId);
      conditions.push(`ar.job_id = $${params.length}`);
    }
    if (filters.workDate) {
      params.push(filters.workDate);
      conditions.push(`ar.work_date = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`ar.status = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    params.push(filters.limit, offset);

    const { rows } = await this.db.query(
      `SELECT
         ar.*,
         wp.full_name AS worker_name,
         j.title      AS job_title,
         cs.name      AS site_name,
         mp.company_name AS manager_company
       FROM app.attendance_records ar
       JOIN app.worker_profiles wp ON ar.worker_id = wp.id
       JOIN app.jobs j ON ar.job_id = j.id
       JOIN app.construction_sites cs ON j.site_id = cs.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       ${where}
       ORDER BY ar.work_date DESC, wp.full_name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const countParams = params.slice(0, -2);
    const { rows: countRows } = await this.db.query(
      `SELECT COUNT(*)::int AS total
       FROM app.attendance_records ar
       JOIN app.worker_profiles wp ON ar.worker_id = wp.id
       JOIN app.jobs j ON ar.job_id = j.id
       ${where}`,
      countParams,
    );

    return { data: rows, total: countRows[0]?.total ?? 0 };
  }

  async adminUpdate(id: string, data: {
    status?: string;
    workerStatus?: string;
    workHours?: number;
    workMinutes?: number;
    workDurationConfirmed?: boolean;
    notes?: string;
  }) {
    const setClauses: string[] = [];
    const params: unknown[] = [id];

    function add(col: string, val: unknown) {
      params.push(val);
      setClauses.push(`${col} = $${params.length}`);
    }

    if (data.status !== undefined) { add('status', data.status); add('manager_status_at', new Date()); }
    if (data.workerStatus !== undefined) { add('worker_status', data.workerStatus); add('worker_status_at', new Date()); }
    if (data.workHours !== undefined) add('work_hours', data.workHours);
    if (data.workMinutes !== undefined) add('work_minutes', data.workMinutes);
    if (data.workDurationConfirmed !== undefined) {
      add('work_duration_confirmed', data.workDurationConfirmed);
      if (data.workDurationConfirmed) add('work_duration_confirmed_at', new Date());
    }
    if (data.notes !== undefined) add('notes', data.notes);

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await this.db.query(
      `UPDATE app.attendance_records SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0];
  }
}
