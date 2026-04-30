package vn.gada.api.attendance

import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService

@Repository
class AttendanceRepository(private val db: DatabaseService) {

    fun findByJobId(jobId: String, managerUserId: String): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT ar.*, wp.full_name as worker_name, wp.id as worker_profile_id
               FROM app.attendance_records ar
               JOIN app.worker_profiles wp ON ar.worker_id = wp.id
               JOIN app.jobs j ON ar.job_id = j.id
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               WHERE ar.job_id = ? AND mp.user_id = ?
               ORDER BY wp.full_name ASC""",
            jobId, managerUserId
        )
    }

    fun findById(id: String): Map<String, Any?>? {
        return db.queryForList(
            "SELECT * FROM app.attendance_records WHERE id = ?",
            id
        ).firstOrNull()
    }

    fun findWorkerUserIdByRecord(id: String): String? {
        return db.queryForList(
            """SELECT u.id as user_id FROM app.attendance_records ar
               JOIN app.worker_profiles wp ON ar.worker_id = wp.id
               JOIN auth.users u ON wp.user_id = u.id
               WHERE ar.id = ?""",
            id
        ).firstOrNull()?.get("user_id") as? String
    }

    fun update(
        id: String,
        managerUserId: String,
        status: String,
        notes: String?
    ): Map<String, Any?>? {
        return db.queryForListRaw(
            """UPDATE app.attendance_records ar
               SET status = ?, notes = COALESCE(?, ar.notes),
                   marked_at = NOW()
               FROM app.jobs j
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               WHERE ar.id = ? AND ar.job_id = j.id AND mp.user_id = ?
               RETURNING ar.*, mp.id as marked_by_id""",
            status, notes, id, managerUserId
        ).firstOrNull()
    }

    fun getStatusHistory(attendanceId: String): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT id,
                      changed_by_role AS "changedByRole",
                      changed_by_name AS "changedByName",
                      old_status      AS "oldStatus",
                      new_status      AS "newStatus",
                      changed_at      AS "changedAt",
                      note
               FROM app.attendance_status_history
               WHERE attendance_id = ?
               ORDER BY changed_at ASC""",
            attendanceId
        )
    }

    /** Worker sets their own status (e.g. PRE_CONFIRMED, COMMUTING, WORK_STARTED) */
    fun setWorkerStatus(id: String, workerUserId: String, status: String): Map<String, Any?>? {
        return db.queryForListRaw(
            """UPDATE app.attendance_records ar
               SET worker_status = ?,
                   worker_status_at = NOW(),
                   status = ?,
                   updated_by_role = 'WORKER',
                   updated_by_id = (
                     SELECT wp.id FROM app.worker_profiles wp
                     JOIN auth.users u ON wp.user_id = u.id
                     WHERE u.id = ?
                   ),
                   marked_at = NOW()
               FROM app.worker_profiles wp
               JOIN auth.users u ON wp.user_id = u.id
               WHERE ar.id = ? AND ar.worker_id = wp.id AND u.id = ?
               RETURNING ar.*""",
            status, status, workerUserId, id, workerUserId
        ).firstOrNull()
    }

    /** Worker sets their work duration */
    fun setWorkerDuration(id: String, workerUserId: String, hours: Int, minutes: Int): Map<String, Any?>? {
        return db.queryForListRaw(
            """UPDATE app.attendance_records ar
               SET work_hours = ?,
                   work_minutes = ?,
                   work_duration_set_by = 'WORKER',
                   work_duration_confirmed = FALSE,
                   marked_at = NOW()
               FROM app.worker_profiles wp
               JOIN auth.users u ON wp.user_id = u.id
               WHERE ar.id = ? AND ar.worker_id = wp.id AND u.id = ?
               RETURNING ar.*""",
            hours, minutes, id, workerUserId
        ).firstOrNull()
    }

    /** Worker confirms the work duration */
    fun confirmWorkerDuration(id: String, workerUserId: String): Map<String, Any?>? {
        return db.queryForListRaw(
            """UPDATE app.attendance_records ar
               SET work_duration_confirmed = TRUE,
                   work_duration_confirmed_at = NOW(),
                   marked_at = NOW()
               FROM app.worker_profiles wp
               JOIN auth.users u ON wp.user_id = u.id
               WHERE ar.id = ? AND ar.worker_id = wp.id AND u.id = ? AND work_hours IS NOT NULL
               RETURNING ar.*""",
            id, workerUserId
        ).firstOrNull()
    }

    /** Manager sets work duration */
    fun setManagerDuration(id: String, managerUserId: String, hours: Int, minutes: Int): Map<String, Any?>? {
        return db.queryForListRaw(
            """UPDATE app.attendance_records ar
               SET work_hours = ?,
                   work_minutes = ?,
                   work_duration_set_by = 'MANAGER',
                   work_duration_confirmed = FALSE,
                   marked_at = NOW()
               FROM app.jobs j
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               WHERE ar.id = ? AND ar.job_id = j.id AND mp.user_id = ?
               RETURNING ar.*""",
            hours, minutes, id, managerUserId
        ).firstOrNull()
    }

    /** Manager confirms the work duration */
    fun confirmManagerDuration(id: String, managerUserId: String): Map<String, Any?>? {
        return db.queryForListRaw(
            """UPDATE app.attendance_records ar
               SET work_duration_confirmed = TRUE,
                   work_duration_confirmed_at = NOW(),
                   marked_at = NOW()
               FROM app.jobs j
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               WHERE ar.id = ? AND ar.job_id = j.id AND mp.user_id = ? AND work_hours IS NOT NULL
               RETURNING ar.*""",
            id, managerUserId
        ).firstOrNull()
    }

    fun bulkUpsert(
        jobId: String,
        managerUserId: String,
        records: List<Map<String, Any?>>
    ): List<Map<String, Any?>> {
        return db.transaction {
            val jobRows = queryForList(
                """SELECT j.manager_id FROM app.jobs j
                   JOIN app.manager_profiles mp ON j.manager_id = mp.id
                   WHERE j.id = ? AND mp.user_id = ?""",
                jobId, managerUserId
            )
            if (jobRows.isEmpty()) throw RuntimeException("Job not found or unauthorized")
            val managerId = jobRows[0]["manager_id"] as String

            val results = mutableListOf<Map<String, Any?>>()
            for (record in records) {
                val rows = queryForListRaw(
                    """INSERT INTO app.attendance_records (job_id, worker_id, work_date, status, notes, marked_by, marked_at)
                       VALUES (?, ?, ?, ?, ?, ?, NOW())
                       ON CONFLICT (job_id, worker_id, work_date)
                       DO UPDATE SET
                         status = ?,
                         notes = COALESCE(?, app.attendance_records.notes),
                         marked_by = ?,
                         marked_at = NOW()
                       RETURNING *""",
                    jobId, record["workerId"], record["workDate"], record["status"],
                    record["notes"], managerId,
                    record["status"], record["notes"], managerId
                )
                rows.firstOrNull()?.let { results.add(it) }
            }
            results
        }
    }
}
