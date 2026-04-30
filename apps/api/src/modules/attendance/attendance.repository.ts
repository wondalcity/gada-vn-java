import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

export type AttendanceStatus =
  | 'PENDING'
  | 'PRE_CONFIRMED'
  | 'COMMUTING'
  | 'WORK_STARTED'
  | 'WORK_COMPLETED'
  | 'ATTENDED'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'EARLY_LEAVE';

export type UpdatedByRole = 'WORKER' | 'MANAGER' | 'SYSTEM';

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

  // ── 이력 조회 ────────────────────────────────────────────────────────────

  async findHistory(attendanceId: string) {
    const { rows } = await this.db.query(
      `SELECT * FROM app.attendance_status_history
       WHERE attendance_id = $1
       ORDER BY changed_at ASC`,
      [attendanceId],
    );
    return rows;
  }

  // ── 이력 기록 (내부 헬퍼) ─────────────────────────────────────────────

  private async logHistory(
    client: { query: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }> },
    attendanceId: string,
    changedByRole: UpdatedByRole,
    changedById: string | null,
    changedByName: string | null,
    oldStatus: string | null,
    newStatus: string,
    note?: string,
  ) {
    await client.query(
      `INSERT INTO app.attendance_status_history
         (attendance_id, changed_by_role, changed_by_id, changed_by_name,
          old_status, new_status, changed_at, note)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [attendanceId, changedByRole, changedById, changedByName, oldStatus, newStatus, note ?? null],
    );
  }

  // ── 관리자 상태 업데이트 ──────────────────────────────────────────────

  async updateManagerStatus(
    id: string,
    managerUserId: string,
    data: { status: string; notes?: string },
  ) {
    return this.db.transaction(async (client) => {
      // 현재 기록 조회
      const { rows: current } = await client.query(
        `SELECT ar.status, mp.id AS manager_profile_id, mp.company_name
         FROM app.attendance_records ar
         JOIN app.jobs j ON ar.job_id = j.id
         JOIN app.manager_profiles mp ON j.manager_id = mp.id
         WHERE ar.id = $1 AND mp.user_id = $2`,
        [id, managerUserId],
      );
      if (current.length === 0) return null;

      const oldStatus = current[0].status as string;
      const managerId = current[0].manager_profile_id as string;
      const managerName = (current[0].company_name as string) || '관리자';

      const { rows } = await client.query(
        `UPDATE app.attendance_records ar
         SET status            = $2,
             notes             = COALESCE($3, ar.notes),
             marked_at         = NOW(),
             manager_status_at = NOW(),
             updated_by_role   = 'MANAGER',
             updated_by_id     = mp.id
         FROM app.jobs j
         JOIN app.manager_profiles mp ON j.manager_id = mp.id
         WHERE ar.id = $1 AND ar.job_id = j.id AND mp.user_id = $4
         RETURNING ar.*`,
        [id, data.status, data.notes ?? null, managerUserId],
      );

      if (oldStatus !== data.status) {
        await this.logHistory(
          client, id, 'MANAGER', managerId, managerName,
          oldStatus, data.status, data.notes,
        );
      }

      return rows[0];
    });
  }

  // ── 근로자 상태 업데이트 ──────────────────────────────────────────────

  async updateWorkerStatus(
    id: string,
    workerProfileId: string,
    workerName: string,
    status: AttendanceStatus,
  ) {
    return this.db.transaction(async (client) => {
      const { rows: current } = await client.query(
        'SELECT status, worker_status FROM app.attendance_records WHERE id = $1',
        [id],
      );
      if (current.length === 0) return null;

      const oldStatus = current[0].status as string;

      const { rows } = await client.query(
        `UPDATE app.attendance_records
         SET worker_status      = $2,
             worker_status_at   = NOW(),
             status             = $2,
             updated_by_role    = 'WORKER',
             updated_by_id      = $3
         WHERE id = $1
         RETURNING *`,
        [id, status, workerProfileId],
      );

      if (oldStatus !== status) {
        await this.logHistory(
          client, id, 'WORKER', workerProfileId, workerName,
          oldStatus, status,
        );
      }

      return rows[0];
    });
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
      const { rows: jobRows } = await client.query<{ manager_id: string; company_name: string }>(
        `SELECT j.manager_id, mp.company_name FROM app.jobs j
         JOIN app.manager_profiles mp ON j.manager_id = mp.id
         WHERE j.id = $1 AND mp.user_id = $2`,
        [jobId, managerUserId],
      );
      if (jobRows.length === 0) throw new Error('Job not found or unauthorized');
      const managerId = jobRows[0].manager_id;
      const managerName = jobRows[0].company_name || '관리자';

      const results = [];
      for (const record of records) {
        // Get current status before upsert
        const { rows: existing } = await client.query(
          `SELECT id, status FROM app.attendance_records
           WHERE job_id = $1 AND worker_id = $2 AND work_date = $3`,
          [jobId, record.workerId, record.workDate],
        );

        const { rows } = await client.query(
          `INSERT INTO app.attendance_records
             (job_id, worker_id, work_date, status, notes, marked_by, marked_at,
              manager_status_at, updated_by_role, updated_by_id)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), 'MANAGER', $6)
           ON CONFLICT (job_id, worker_id, work_date) DO UPDATE SET
             status            = $4,
             notes             = COALESCE($5, app.attendance_records.notes),
             marked_by         = $6,
             marked_at         = NOW(),
             manager_status_at = NOW(),
             updated_by_role   = 'MANAGER',
             updated_by_id     = $6
           RETURNING *`,
          [jobId, record.workerId, record.workDate, record.status, record.notes ?? null, managerId],
        );

        // Log history if status changed
        const oldStatus = existing[0]?.status ?? null;
        if (oldStatus !== record.status) {
          await this.logHistory(
            client, rows[0].id, 'MANAGER', managerId, managerName,
            oldStatus, record.status, record.notes,
          );
        }
        results.push(rows[0]);
      }
      return results;
    });
  }

  // ── Workers 조회 (자신의 출퇴근 기록) ────────────────────────────────

  async findWorkerAttendance(workerUserId: string, jobId?: string) {
    const params: unknown[] = [workerUserId];
    const jobFilter = jobId ? `AND ar.job_id = $2` : '';
    if (jobId) params.push(jobId);

    const { rows } = await this.db.query(
      `SELECT
         ar.*,
         j.title_ko      AS job_title_ko,
         j.title_vi      AS job_title_vi,
         j.title_ko      AS job_title,
         cs.name         AS site_name,
         j.daily_wage,
         j.work_start_time,
         -- manager 이름
         mp.company_name AS manager_name,
         -- 최근 이력 3건 (JSON 배열)
         COALESCE(
           (SELECT json_agg(h ORDER BY h.changed_at ASC)
            FROM (
              SELECT id, changed_by_role, changed_by_name, old_status, new_status,
                     changed_at, note
              FROM app.attendance_status_history
              WHERE attendance_id = ar.id
              ORDER BY changed_at ASC
            ) h
           ), '[]'::json
         ) AS status_history
       FROM app.attendance_records ar
       JOIN app.worker_profiles wp ON ar.worker_id = wp.id
       JOIN app.users u ON wp.user_id = u.id
       JOIN app.jobs j ON ar.job_id = j.id
       JOIN app.construction_sites cs ON j.site_id = cs.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE u.id = $1 ${jobFilter}
       ORDER BY ar.work_date DESC`,
      params,
    );
    return rows;
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
         j.title_ko   AS job_title,
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
