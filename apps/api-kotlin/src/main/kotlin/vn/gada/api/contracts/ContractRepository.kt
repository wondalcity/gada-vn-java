package vn.gada.api.contracts

import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService

@Repository
class ContractRepository(
    private val db: DatabaseService,
    private val fileService: vn.gada.api.files.FileService
) {

    fun findAcceptedApplication(applicationId: String, managerUserId: String): Map<String, Any?>? {
        return db.queryForList(
            """SELECT a.*, j.id as job_id, j.title as job_title, j.work_date,
                      j.daily_wage, j.start_time, j.end_time,
                      mp.id as manager_profile_id,
                      wp.id as worker_profile_id, wp.full_name as worker_name
               FROM app.job_applications a
               JOIN app.jobs j ON a.job_id = j.id
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               JOIN app.worker_profiles wp ON a.worker_id = wp.id
               WHERE a.id = ? AND mp.user_id = ? AND a.status = 'ACCEPTED'""",
            applicationId, managerUserId
        ).firstOrNull()
    }

    fun findById(id: String): Map<String, Any?>? {
        try { java.util.UUID.fromString(id) } catch (_: Exception) { return null }
        val row = db.queryForList(
            """SELECT c.id, c.status,
                      c.contract_html          AS "contractHtml",
                      c.worker_signature_s3_key AS "workerSigRaw",
                      c.manager_signature_s3_key AS "managerSigRaw",
                      c.worker_signed_at        AS "workerSignedAt",
                      c.manager_signed_at       AS "managerSignedAt",
                      c.created_at              AS "createdAt",
                      j.title                   AS "jobTitle",
                      j.work_date               AS "workDate",
                      j.start_time              AS "startTime",
                      j.end_time                AS "endTime",
                      j.slots_total             AS "slotsTotal",
                      j.daily_wage              AS "dailyWage",
                      s.name                    AS "siteName",
                      s.address                 AS "siteAddress",
                      wp.full_name              AS "workerName",
                      uw.phone                  AS "workerPhone",
                      mp.representative_name    AS "managerName",
                      um.phone                  AS "managerPhone",
                      mp.company_name           AS "companyName"
               FROM app.contracts c
               JOIN app.jobs j ON c.job_id = j.id
               JOIN app.construction_sites s ON j.site_id = s.id
               JOIN app.worker_profiles wp ON c.worker_id = wp.id
               JOIN app.manager_profiles mp ON c.manager_id = mp.id
               JOIN auth.users uw ON wp.user_id = uw.id
               JOIN auth.users um ON mp.user_id = um.id
               WHERE c.id = ?""",
            id
        ).firstOrNull() ?: return null
        return row + mapOf(
            "workerSigUrl"  to fileService.toPublicUrl(row["workerSigRaw"] as? String),
            "managerSigUrl" to fileService.toPublicUrl(row["managerSigRaw"] as? String),
            "downloadUrl"   to null,
        )
    }

    fun findByWorkerUserId(workerUserId: String): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT c.id, c.status,
                      j.title          AS "jobTitle",
                      j.work_date      AS "workDate",
                      j.daily_wage     AS "dailyWage",
                      s.name           AS "siteName",
                      mp.representative_name AS "managerName",
                      c.worker_signed_at     AS "workerSignedAt",
                      c.created_at           AS "createdAt"
               FROM app.contracts c
               JOIN app.jobs j ON c.job_id = j.id
               JOIN app.construction_sites s ON j.site_id = s.id
               JOIN app.worker_profiles wp ON c.worker_id = wp.id
               JOIN app.manager_profiles mp ON c.manager_id = mp.id
               WHERE wp.user_id = ?
               ORDER BY c.created_at DESC""",
            workerUserId
        )
    }

    fun isUserPartyToContract(contractId: String, userId: String): Boolean {
        val rows = db.queryForList(
            """SELECT COUNT(*) as count FROM app.contracts c
               JOIN app.manager_profiles mp ON c.manager_id = mp.id
               JOIN app.worker_profiles wp ON c.worker_id = wp.id
               WHERE c.id = ? AND (mp.user_id = ? OR wp.user_id = ?)""",
            contractId, userId, userId
        )
        return ((rows.firstOrNull()?.get("count") as? Number)?.toInt() ?: 0) > 0
    }

    fun isWorkerPartyToContract(contractId: String, workerUserId: String): Boolean {
        val rows = db.queryForList(
            """SELECT COUNT(*) as count FROM app.contracts c
               JOIN app.worker_profiles wp ON c.worker_id = wp.id
               WHERE c.id = ? AND wp.user_id = ?""",
            contractId, workerUserId
        )
        return ((rows.firstOrNull()?.get("count") as? Number)?.toInt() ?: 0) > 0
    }

    fun findPartyUserIds(contractId: String): Map<String, String?> {
        val rows = db.queryForList(
            """SELECT uw.id as worker_user_id, um.id as manager_user_id
               FROM app.contracts c
               JOIN app.worker_profiles wp ON c.worker_id = wp.id
               JOIN app.manager_profiles mp ON c.manager_id = mp.id
               JOIN auth.users uw ON wp.user_id = uw.id
               JOIN auth.users um ON mp.user_id = um.id
               WHERE c.id = ?""",
            contractId
        )
        val r = rows.firstOrNull()
        return mapOf(
            "workerUserId" to r?.get("worker_user_id") as? String,
            "managerUserId" to r?.get("manager_user_id") as? String
        )
    }

    fun create(
        applicationId: String,
        jobId: String,
        workerId: String,
        managerId: String,
        contractHtml: String
    ): Map<String, Any?>? {
        return db.queryForList(
            """INSERT INTO app.contracts
                 (application_id, job_id, worker_id, manager_id, contract_html, status)
               VALUES (?, ?, ?, ?, ?, 'PENDING_WORKER_SIGN')
               RETURNING *""",
            applicationId, jobId, workerId, managerId, contractHtml
        ).firstOrNull()
    }

    fun sign(contractId: String, workerUserId: String, signatureS3Key: String): Map<String, Any?>? {
        return db.queryForListRaw(
            """UPDATE app.contracts c
               SET worker_signature_s3_key = ?,
                   worker_signed_at = NOW(),
                   status = 'FULLY_SIGNED',
                   updated_at = NOW()
               FROM app.worker_profiles wp
               WHERE c.id = ? AND c.worker_id = wp.id AND wp.user_id = ?
               RETURNING c.*""",
            signatureS3Key, contractId, workerUserId
        ).firstOrNull()
    }
}
