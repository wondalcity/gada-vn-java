package vn.gada.api.workers

import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService

@Repository
class WorkerRepository(private val db: DatabaseService) {

    fun findByUserId(userId: String): Map<String, Any?>? {
        val rows = db.queryForList(
            "SELECT * FROM app.worker_profiles WHERE user_id = ?",
            userId
        )
        return rows.firstOrNull()
    }

    fun findHiresByUserId(userId: String): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT
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
               WHERE a.worker_id = (SELECT id FROM app.worker_profiles WHERE user_id = ?)
                 AND a.status IN ('ACCEPTED', 'CONTRACTED')
               ORDER BY a.reviewed_at DESC NULLS LAST""",
            userId
        )
    }

    fun findAttendanceByUserId(userId: String, jobId: String?): List<Map<String, Any?>> {
        return if (jobId != null) {
            db.queryForList(
                """SELECT
                     ar.id, ar.job_id AS "jobId", j.title AS "jobTitle",
                     cs.name AS "siteName", ar.work_date AS "workDate",
                     ar.status, ar.check_in_time AS "checkInTime",
                     ar.check_out_time AS "checkOutTime",
                     ar.hours_worked AS "hoursWorked", ar.notes
                   FROM app.attendance_records ar
                   JOIN app.jobs j ON j.id = ar.job_id
                   JOIN app.construction_sites cs ON cs.id = j.site_id
                   WHERE ar.worker_id = (SELECT id FROM app.worker_profiles WHERE user_id = ?)
                     AND ar.job_id = ?
                   ORDER BY ar.work_date DESC""",
                userId, jobId
            )
        } else {
            db.queryForList(
                """SELECT
                     ar.id, ar.job_id AS "jobId", j.title AS "jobTitle",
                     cs.name AS "siteName", ar.work_date AS "workDate",
                     ar.status, ar.check_in_time AS "checkInTime",
                     ar.check_out_time AS "checkOutTime",
                     ar.hours_worked AS "hoursWorked", ar.notes
                   FROM app.attendance_records ar
                   JOIN app.jobs j ON j.id = ar.job_id
                   JOIN app.construction_sites cs ON cs.id = j.site_id
                   WHERE ar.worker_id = (SELECT id FROM app.worker_profiles WHERE user_id = ?)
                   ORDER BY ar.work_date DESC""",
                userId
            )
        }
    }

    fun updateByUserId(userId: String, fullName: Any?, experienceMonths: Any?): Map<String, Any?>? {
        val rows = db.queryForListRaw(
            """INSERT INTO app.worker_profiles (user_id, full_name, date_of_birth, experience_months)
               VALUES (?, ?, '1990-01-01', COALESCE(?, 0))
               ON CONFLICT (user_id) DO UPDATE
                 SET full_name = COALESCE(?, app.worker_profiles.full_name),
                     experience_months = COALESCE(?, app.worker_profiles.experience_months),
                     updated_at = NOW()
               RETURNING *""",
            userId, fullName, experienceMonths, fullName, experienceMonths
        )
        return rows.firstOrNull()
    }
}
