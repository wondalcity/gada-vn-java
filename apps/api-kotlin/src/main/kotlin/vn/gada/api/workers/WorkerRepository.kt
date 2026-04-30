package vn.gada.api.workers

import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService
import vn.gada.api.files.FileService

@Repository
class WorkerRepository(
    private val db: DatabaseService,
    private val fileService: FileService
) {

    fun findByUserId(userId: String): Map<String, Any?>? {
        val rows = db.queryForList(
            """SELECT wp.id, wp.user_id,
                      wp.full_name,
                      wp.date_of_birth,
                      wp.gender,
                      wp.bio,
                      wp.experience_months,
                      wp.primary_trade_id,
                      t.name_ko          AS trade_name_ko,
                      wp.current_province,
                      wp.current_district,
                      wp.lat, wp.lng,
                      wp.id_number,
                      wp.id_verified,
                      wp.id_verified_at,
                      wp.bank_name,
                      wp.bank_account_number,
                      wp.profile_picture_s3_key,
                      wp.signature_s3_key,
                      wp.id_front_s3_key,
                      wp.id_back_s3_key,
                      wp.bank_book_s3_key,
                      wp.profile_complete,
                      wp.terms_accepted,
                      wp.privacy_accepted,
                      wp.created_at,
                      u.phone, u.email
               FROM app.worker_profiles wp
               JOIN auth.users u ON wp.user_id = u.id
               LEFT JOIN ref.construction_trades t ON wp.primary_trade_id = t.id
               WHERE wp.user_id = ?""",
            userId
        )
        val row = rows.firstOrNull() ?: return null
        return row + mapOf(
            "profile_image_url" to fileService.toPublicUrl(row["profile_picture_s3_key"] as? String),
            "signature_url"     to fileService.toPublicUrl(row["signature_s3_key"] as? String),
            "id_front_url"      to fileService.toPublicUrl(row["id_front_s3_key"] as? String),
            "id_back_url"       to fileService.toPublicUrl(row["id_back_s3_key"] as? String),
            "bank_book_url"     to fileService.toPublicUrl(row["bank_book_s3_key"] as? String),
        )
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
        val baseSelect = """
            SELECT ar.id,
                   ar.job_id              AS "jobId",
                   j.title                AS "jobTitle",
                   COALESCE(cs.name, '')  AS "siteName",
                   ar.work_date           AS "workDate",
                   j.start_time           AS "workStartTime",
                   j.daily_wage           AS "dailyWage",
                   ar.status,
                   ar.status              AS "managerStatus",
                   ar.manager_status_at   AS "managerStatusAt",
                   ar.worker_status       AS "workerStatus",
                   ar.worker_status_at    AS "workerStatusAt",
                   ar.updated_by_role     AS "updatedByRole",
                   ar.marked_at           AS "lastUpdatedAt",
                   ar.work_hours          AS "workHours",
                   ar.work_minutes        AS "workMinutes",
                   ar.work_duration_set_by AS "workDurationSetBy",
                   ar.work_duration_confirmed AS "workDurationConfirmed",
                   ar.work_duration_confirmed_at AS "workDurationConfirmedAt",
                   ar.notes
            FROM app.attendance_records ar
            JOIN app.jobs j ON j.id = ar.job_id
            LEFT JOIN app.construction_sites cs ON cs.id = j.site_id
            WHERE ar.worker_id = (SELECT id FROM app.worker_profiles WHERE user_id = ?)"""

        val records = if (jobId != null) {
            db.queryForList("$baseSelect AND ar.job_id = ? ORDER BY ar.work_date DESC", userId, jobId)
        } else {
            db.queryForList("$baseSelect ORDER BY ar.work_date DESC", userId)
        }

        // Embed status history in each record
        return records.map { rec ->
            val attendanceId = rec["id"] as? String ?: return@map rec
            val history = db.queryForList(
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
            rec + mapOf("statusHistory" to history)
        }
    }

    fun findTradeSkillsByUserId(userId: String): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT wts.trade_id, wts.years, t.name_ko, t.name_vi, t.code
               FROM app.worker_trade_skills wts
               JOIN ref.construction_trades t ON wts.trade_id = t.id
               WHERE wts.worker_id = (SELECT id FROM app.worker_profiles WHERE user_id = ?)
               ORDER BY wts.years DESC""",
            userId
        )
    }

    fun updateTradeSkillsByUserId(userId: String, skills: List<Map<String, Any?>>): List<Map<String, Any?>> {
        ensureProfile(userId)
        val workerId = db.queryForList(
            "SELECT id FROM app.worker_profiles WHERE user_id = ?", userId
        ).firstOrNull()?.get("id") as? String ?: return emptyList()
        db.update("DELETE FROM app.worker_trade_skills WHERE worker_id = ?", workerId)
        for (skill in skills) {
            val tradeId = (skill["tradeId"] as? Number)?.toInt()
                ?: skill["tradeId"]?.toString()?.toIntOrNull() ?: continue
            val years = (skill["years"] as? Number)?.toInt() ?: 0
            db.updateRaw(
                """INSERT INTO app.worker_trade_skills (worker_id, trade_id, years)
                   VALUES (?, ?, ?)
                   ON CONFLICT (worker_id, trade_id) DO UPDATE SET years = EXCLUDED.years""",
                workerId, tradeId, years
            )
        }
        // Also update primary_trade_id to the skill with most years
        if (skills.isNotEmpty()) {
            val top = skills.maxByOrNull { (it["years"] as? Number)?.toInt() ?: 0 }
            top?.get("tradeId")?.let { topTradeId ->
                val topId = (topTradeId as? Number)?.toInt()
                    ?: topTradeId.toString().toIntOrNull()
                if (topId != null) {
                    db.updateRaw(
                        "UPDATE app.worker_profiles SET primary_trade_id = ?, updated_at = NOW() WHERE user_id = ?",
                        topId, userId
                    )
                }
            }
        }
        return findTradeSkillsByUserId(userId)
    }

    fun updateByUserId(userId: String, data: Map<String, Any?>): Map<String, Any?>? {
        val setClauses = mutableListOf<String>()
        val params = mutableListOf<Any?>()

        data["fullName"]?.let             { setClauses.add("full_name = ?");               params.add(it) }
        data["dateOfBirth"]?.let          { setClauses.add("date_of_birth = ?::date");    params.add(it) }
        data["gender"]?.let               { setClauses.add("gender = ?");                params.add(it) }
        data["bio"]?.let                  { setClauses.add("bio = ?");                   params.add(it) }
        data["experienceMonths"]?.let     { setClauses.add("experience_months = ?");     params.add(it) }
        data["primaryTradeId"]?.let       { setClauses.add("primary_trade_id = ?");      params.add(it) }
        data["province"]?.let             { setClauses.add("current_province = ?");      params.add(it) }
        data["district"]?.let             { setClauses.add("current_district = ?");      params.add(it) }
        data["lat"]?.let                  { setClauses.add("lat = ?");                   params.add(it) }
        data["lng"]?.let                  { setClauses.add("lng = ?");                   params.add(it) }
        data["bankName"]?.let             { setClauses.add("bank_name = ?");             params.add(it) }
        data["bankAccountNumber"]?.let    { setClauses.add("bank_account_number = ?");   params.add(it) }
        data["idNumber"]?.let             { setClauses.add("id_number = ?");             params.add(it) }
        data["termsAccepted"]?.let        { setClauses.add("terms_accepted = ?");        params.add(it) }
        data["privacyAccepted"]?.let      { setClauses.add("privacy_accepted = ?");      params.add(it) }
        // S3 key fields: use containsKey to allow explicit null (delete)
        if (data.containsKey("profilePictureS3Key")) { setClauses.add("profile_picture_s3_key = ?"); params.add(data["profilePictureS3Key"]) }
        if (data.containsKey("signatureS3Key"))      { setClauses.add("signature_s3_key = ?");       params.add(data["signatureS3Key"]) }
        if (data.containsKey("idFrontS3Key"))        { setClauses.add("id_front_s3_key = ?");        params.add(data["idFrontS3Key"]) }
        if (data.containsKey("idBackS3Key"))         { setClauses.add("id_back_s3_key = ?");         params.add(data["idBackS3Key"]) }
        if (data.containsKey("bankBookS3Key"))       { setClauses.add("bank_book_s3_key = ?");       params.add(data["bankBookS3Key"]) }

        if (setClauses.isEmpty()) return findByUserId(userId)

        setClauses.add("updated_at = NOW()")
        params.add(userId)

        ensureProfile(userId)

        db.updateRaw(
            "UPDATE app.worker_profiles SET ${setClauses.joinToString(", ")} WHERE user_id = ?",
            *params.toTypedArray()
        )
        return findByUserId(userId)
    }

    /** Ensure a worker_profiles row exists for the user (idempotent). */
    private fun ensureProfile(userId: String) {
        db.updateRaw(
            "INSERT INTO app.worker_profiles (user_id, full_name) VALUES (?, '') ON CONFLICT (user_id) DO NOTHING",
            userId
        )
    }

    // ── Saved Locations ───────────────────────────────────────────────────────

    fun findSavedLocationsByUserId(userId: String): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT id, worker_id, label, address, lat, lng, is_default, created_at
               FROM app.worker_saved_locations
               WHERE worker_id = (SELECT id FROM app.worker_profiles WHERE user_id = ?)
               ORDER BY is_default DESC, created_at ASC""",
            userId
        )
    }

    fun createSavedLocation(userId: String, label: String, address: String?, lat: Double?, lng: Double?, isDefault: Boolean): Map<String, Any?> {
        ensureProfile(userId)
        if (isDefault) {
            // Clear existing default
            db.updateRaw(
                """UPDATE app.worker_saved_locations SET is_default = FALSE
                   WHERE worker_id = (SELECT id FROM app.worker_profiles WHERE user_id = ?)""",
                userId
            )
        }
        val rows = db.queryForList(
            """INSERT INTO app.worker_saved_locations (worker_id, label, address, lat, lng, is_default)
               SELECT wp.id, ?, ?, ?, ?, ?
               FROM app.worker_profiles wp WHERE wp.user_id = ?
               RETURNING id, worker_id, label, address, lat, lng, is_default, created_at""",
            label, address, lat, lng, isDefault, userId
        )
        return rows.first()
    }

    fun deleteSavedLocation(id: String, userId: String): Boolean {
        val count = db.updateRaw(
            """DELETE FROM app.worker_saved_locations
               WHERE id = ?::uuid
                 AND worker_id = (SELECT id FROM app.worker_profiles WHERE user_id = ?)""",
            id, userId
        )
        return count > 0
    }
}
