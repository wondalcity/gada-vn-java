package vn.gada.api.applications

import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService

@Repository
class ApplicationRepository(private val db: DatabaseService) {

    fun findByWorkerAndJob(userId: String, jobId: String): Map<String, Any?>? {
        return db.queryForList(
            """SELECT a.* FROM app.job_applications a
               JOIN app.worker_profiles wp ON a.worker_id = wp.id
               WHERE wp.user_id = ? AND a.job_id = ?""",
            userId, jobId
        ).firstOrNull()
    }

    fun findById(id: String): Map<String, Any?>? {
        return db.queryForList(
            "SELECT * FROM app.job_applications WHERE id = ?",
            id
        ).firstOrNull()
    }

    fun findByWorkerUserId(userId: String, page: Int, limit: Int): List<Map<String, Any?>> {
        val offset = (page - 1) * limit
        return db.queryForList(
            """SELECT a.id,
                      a.job_id         AS "jobId",
                      a.status,
                      a.notes,
                      a.applied_at     AS "appliedAt",
                      a.reviewed_at    AS "reviewedAt",
                      j.title          AS "jobTitle",
                      j.work_date      AS "workDate",
                      j.daily_wage     AS "dailyWage",
                      j.site_id        AS "siteId",
                      s.name           AS "siteName",
                      s.address
               FROM app.job_applications a
               JOIN app.worker_profiles wp ON a.worker_id = wp.id
               JOIN app.jobs j ON a.job_id = j.id
               JOIN app.construction_sites s ON j.site_id = s.id
               WHERE wp.user_id = ?
               ORDER BY a.applied_at DESC
               LIMIT ? OFFSET ?""",
            userId, limit, offset
        )
    }

    fun findByJobId(jobId: String, managerUserId: String): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT a.*, wp.full_name as worker_name,
                      wp.experience_months, wp.current_province
               FROM app.job_applications a
               JOIN app.worker_profiles wp ON a.worker_id = wp.id
               JOIN app.jobs j ON a.job_id = j.id
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               WHERE a.job_id = ? AND mp.user_id = ?
               ORDER BY a.applied_at ASC""",
            jobId, managerUserId
        )
    }

    fun create(userId: String, jobId: String): Map<String, Any?>? {
        return db.queryForList(
            """INSERT INTO app.job_applications (worker_id, job_id, status, applied_at)
               SELECT wp.id, ?, 'PENDING', NOW()
               FROM app.worker_profiles wp WHERE wp.user_id = ?
               RETURNING *""",
            jobId, userId
        ).firstOrNull()
    }

    fun findWorkerUserIdByApplication(id: String): String? {
        return db.queryForList(
            """SELECT u.id as user_id FROM app.job_applications a
               JOIN app.worker_profiles wp ON a.worker_id = wp.id
               JOIN auth.users u ON wp.user_id = u.id
               WHERE a.id = ?""",
            id
        ).firstOrNull()?.get("user_id") as? String
    }

    fun updateStatus(id: String, managerUserId: String, status: String): Map<String, Any?>? {
        return db.queryForList(
            """UPDATE app.job_applications a
               SET status = ?, reviewed_at = NOW(), reviewed_by = mp.id
               FROM app.jobs j
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               WHERE a.id = ?
                 AND a.job_id = j.id
                 AND mp.user_id = ?
               RETURNING a.*""",
            status, id, managerUserId
        ).firstOrNull()
    }
}
