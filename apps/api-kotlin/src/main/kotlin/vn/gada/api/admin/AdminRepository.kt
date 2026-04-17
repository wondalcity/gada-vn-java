package vn.gada.api.admin

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService

@Repository
class AdminRepository(
    private val db: DatabaseService,
    private val fileService: vn.gada.api.files.FileService
) {

    private val jsonMapper = jacksonObjectMapper()
    private fun toUrl(key: String?) = fileService.toPublicUrl(key)
    private fun toJsonStr(value: Any?): String = when {
        value == null -> "{}"
        value is String -> value
        else -> jsonMapper.writeValueAsString(value)
    }
    /** Returns null for blank strings so JDBC skips type-specific casts (e.g. DATE, INT) on empty input. */
    private fun nonBlank(v: Any?): Any? = if (v is String && v.isBlank()) null else v

    // sanitize() is now handled by DatabaseService.coerceValue() for all queries.
    // Keep a no-op passthrough for call sites that still reference it.
    private fun sanitize(row: Map<String, Any?>): Map<String, Any?> = row
    private fun sanitizeList(rows: List<Map<String, Any?>>): List<Map<String, Any?>> = rows

    // ── Managers ─────────────────────────────────────────────────────────────

    fun findManagersPaginated(status: String, page: Int, limit: Int): List<Map<String, Any?>> {
        val offset = (page - 1) * limit
        return db.queryForList(
            """SELECT mp.*,
                      COALESCE(wp.full_name, mp.representative_name) as representative_name,
                      u.phone, u.created_at as user_created_at
               FROM app.manager_profiles mp
               JOIN auth.users u ON mp.user_id = u.id
               LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
               WHERE mp.approval_status = ?
               ORDER BY mp.created_at DESC
               LIMIT ? OFFSET ?""",
            status, limit, offset
        )
    }

    fun countManagers(status: String): Int {
        val rows = db.queryForList(
            "SELECT COUNT(*) as count FROM app.manager_profiles WHERE approval_status = ?",
            status
        )
        return (rows.firstOrNull()?.get("count") as? Number)?.toInt() ?: 0
    }

    fun findManagerById(id: String): Map<String, Any?>? {
        val row = db.queryForList(
            """SELECT mp.*, u.phone, u.email, u.created_at as user_created_at,
                      wp.full_name as worker_full_name
               FROM app.manager_profiles mp
               JOIN auth.users u ON mp.user_id = u.id
               LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
               WHERE mp.id = ?""",
            id
        ).firstOrNull() ?: return null
        return row + mapOf(
            "business_reg_url" to toUrl(row["business_reg_s3_key"] as? String),
            "signature_url" to toUrl(row["signature_s3_key"] as? String),
            "profile_picture_url" to toUrl(row["profile_picture_s3_key"] as? String),
        )
    }

    fun approveManager(id: String): Map<String, Any?>? {
        val rows = db.queryForList(
            """UPDATE app.manager_profiles
               SET approval_status = 'APPROVED', approved_at = NOW(), updated_at = NOW()
               WHERE id = ? RETURNING *""",
            id
        )
        val profile = rows.firstOrNull()
        if (profile != null) {
            db.updateRaw(
                "UPDATE auth.users SET role = 'MANAGER', updated_at = NOW() WHERE id = ?",
                profile["user_id"] as String
            )
        }
        return profile
    }

    fun rejectManager(id: String, reason: String): Map<String, Any?>? {
        return db.queryForList(
            """UPDATE app.manager_profiles
               SET approval_status = 'REJECTED', rejection_reason = ?,
                   approved_at = NOW(), updated_at = NOW()
               WHERE id = ? RETURNING *""",
            reason, id
        ).firstOrNull()
    }

    fun revokeManager(id: String): Map<String, Any?>? {
        val rows = db.queryForList(
            """UPDATE app.manager_profiles
               SET approval_status = 'PENDING', approved_at = NULL, updated_at = NOW()
               WHERE id = ? RETURNING *""",
            id
        )
        val profile = rows.firstOrNull()
        if (profile != null) {
            db.updateRaw(
                "UPDATE auth.users SET role = 'WORKER', updated_at = NOW() WHERE id = ?",
                profile["user_id"] as String
            )
        }
        return profile
    }

    fun updateManager(id: String, body: Map<String, Any?>): Map<String, Any?>? {
        val setClauses = mutableListOf<String>()
        val params = mutableListOf<Any?>()

        (body["businessType"] ?: body["business_type"])?.let { setClauses.add("business_type = ?"); params.add(it) }
        (body["companyName"] ?: body["company_name"])?.let { setClauses.add("company_name = ?"); params.add(it) }
        (body["representativeName"] ?: body["representative_name"])?.let { setClauses.add("representative_name = ?"); params.add(it) }
        (body["representativeDob"] ?: body["representative_dob"])?.let { setClauses.add("representative_dob = ?"); params.add(it) }
        (body["representativeGender"] ?: body["representative_gender"])?.let { setClauses.add("representative_gender = ?"); params.add(it) }
        (body["contactPhone"] ?: body["contact_phone"])?.let { setClauses.add("contact_phone = ?"); params.add(it) }
        (body["businessRegNumber"] ?: body["business_reg_number"])?.let { setClauses.add("business_reg_number = ?"); params.add(it) }
        (body["contactAddress"] ?: body["contact_address"])?.let { setClauses.add("contact_address = ?"); params.add(it) }
        body["province"]?.let { setClauses.add("province = ?"); params.add(it) }
        (body["firstSiteName"] ?: body["first_site_name"])?.let { setClauses.add("first_site_name = ?"); params.add(it) }
        (body["firstSiteAddress"] ?: body["first_site_address"])?.let { setClauses.add("first_site_address = ?"); params.add(it) }

        if (setClauses.isEmpty()) return findManagerById(id)

        setClauses.add("updated_at = NOW()")
        params.add(id)
        return db.queryForList(
            "UPDATE app.manager_profiles SET ${setClauses.joinToString(", ")} WHERE id = ? RETURNING *",
            *params.toTypedArray()
        ).firstOrNull()
    }

    fun promoteWorkerToManager(workerId: String, companyName: String, phone: String): Map<String, Any?>? {
        // Find the worker's user_id
        val worker = db.queryForList(
            "SELECT user_id FROM app.worker_profiles WHERE id = ?",
            workerId
        ).firstOrNull() ?: return null
        val userId = worker["user_id"] as String

        // Update phone on auth.users if provided
        if (phone.isNotBlank()) {
            db.updateRaw("UPDATE auth.users SET phone = ?, updated_at = NOW() WHERE id = ?", phone, userId)
        }

        // Insert or update manager_profiles
        return db.queryForList(
            """INSERT INTO app.manager_profiles (user_id, company_name, phone, approval_status, created_at, updated_at)
               VALUES (?, ?, ?, 'APPROVED', NOW(), NOW())
               ON CONFLICT (user_id) DO UPDATE
               SET company_name = EXCLUDED.company_name,
                   phone = EXCLUDED.phone,
                   approval_status = 'APPROVED',
                   approved_at = NOW(),
                   updated_at = NOW()
               RETURNING *""",
            userId, companyName, phone
        ).firstOrNull()
    }

    fun findManagerSites(managerId: String): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT cs.id, cs.manager_id, cs.company_id, cs.name, cs.address, cs.province,
                      cs.district, cs.lat, cs.lng, cs.site_type, cs.status, cs.created_at, cs.updated_at,
                      msa.created_at as assigned_at
               FROM app.construction_sites cs
               JOIN app.manager_site_assignments msa ON msa.site_id = cs.id
               WHERE msa.manager_id = ?
               ORDER BY cs.name""",
            managerId
        )
    }

    fun assignSiteToManager(managerId: String, siteId: String): Map<String, Any?>? {
        return db.queryForList(
            """INSERT INTO app.manager_site_assignments (manager_id, site_id, created_at)
               VALUES (?, ?, NOW())
               ON CONFLICT (manager_id, site_id) DO NOTHING
               RETURNING *""",
            managerId, siteId
        ).firstOrNull() ?: mapOf("manager_id" to managerId, "site_id" to siteId)
    }

    fun unassignSiteFromManager(managerId: String, siteId: String): Int {
        return db.update(
            "DELETE FROM app.manager_site_assignments WHERE manager_id = ? AND site_id = ?",
            managerId, siteId
        )
    }

    // ── Workers ───────────────────────────────────────────────────────────────

    fun searchWorkers(search: String, page: Int, limit: Int): List<Map<String, Any?>> {
        val like = "%$search%"
        val offset = (page - 1) * limit
        val baseSelect = """SELECT wp.*, u.phone, u.email, u.status as user_status,
                      (mp.id IS NOT NULL AND mp.approval_status = 'APPROVED') as is_manager
               FROM app.worker_profiles wp
               JOIN auth.users u ON wp.user_id = u.id
               LEFT JOIN app.manager_profiles mp ON mp.user_id = u.id
               WHERE u.status != 'DELETED'"""
        return if (search.isBlank()) {
            db.queryForList("$baseSelect ORDER BY wp.created_at DESC LIMIT ? OFFSET ?", limit, offset)
        } else {
            db.queryForList(
                "$baseSelect AND (wp.full_name ILIKE ? OR u.phone ILIKE ? OR u.email ILIKE ?) ORDER BY wp.created_at DESC LIMIT ? OFFSET ?",
                like, like, like, limit, offset
            )
        }
    }

    fun findWorkerById(id: String): Map<String, Any?>? {
        val row = db.queryForList(
            """SELECT wp.id, wp.user_id, wp.full_name, wp.date_of_birth, wp.gender, wp.bio,
                      wp.experience_months, wp.primary_trade_id, wp.current_province,
                      wp.current_district, wp.lat, wp.lng, wp.id_number, wp.id_verified,
                      wp.id_verified_at, wp.bank_name, wp.bank_account_number,
                      wp.profile_complete, wp.terms_accepted, wp.privacy_accepted,
                      wp.profile_picture_s3_key, wp.created_at,
                      wp.id_front_s3_key, wp.id_back_s3_key,
                      wp.signature_s3_key, wp.bank_book_s3_key,
                      u.phone, u.email, u.status as user_status,
                      t.name_ko as trade_name_ko,
                      mp.id as manager_profile_id,
                      mp.approval_status as manager_approval_status,
                      mp.company_name as manager_company_name,
                      mp.representative_name as manager_representative_name,
                      mp.approved_at as manager_approved_at,
                      (mp.id IS NOT NULL AND mp.approval_status = 'APPROVED') as is_manager
               FROM app.worker_profiles wp
               JOIN auth.users u ON wp.user_id = u.id
               LEFT JOIN ref.construction_trades t ON wp.primary_trade_id = t.id
               LEFT JOIN app.manager_profiles mp ON mp.user_id = u.id
               WHERE wp.id = ?""",
            id
        ).firstOrNull() ?: return null
        return row + mapOf(
            "id_front_url" to toUrl(row["id_front_s3_key"] as? String),
            "id_back_url" to toUrl(row["id_back_s3_key"] as? String),
            "signature_url" to toUrl(row["signature_s3_key"] as? String),
            "bank_book_url" to toUrl(row["bank_book_s3_key"] as? String),
        )
    }

    fun countWorkers(search: String): Int {
        val like = "%$search%"
        val rows = if (search.isBlank()) {
            db.queryForList(
                """SELECT COUNT(*) as count FROM app.worker_profiles wp
                   JOIN auth.users u ON wp.user_id = u.id
                   WHERE u.status != 'DELETED'"""
            )
        } else {
            db.queryForList(
                """SELECT COUNT(*) as count FROM app.worker_profiles wp
                   JOIN auth.users u ON wp.user_id = u.id
                   WHERE u.status != 'DELETED'
                     AND (wp.full_name ILIKE ? OR u.phone ILIKE ? OR u.email ILIKE ?)""",
                like, like, like
            )
        }
        return (rows.firstOrNull()?.get("count") as? Number)?.toInt() ?: 0
    }

    fun createWorker(phone: String, fullName: String): Map<String, Any?>? {
        // Create auth.users entry first
        val user = db.queryForList(
            """INSERT INTO auth.users (phone, role, status, created_at, updated_at)
               VALUES (?, 'WORKER', 'ACTIVE', NOW(), NOW())
               ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
               RETURNING *""",
            phone
        ).firstOrNull() ?: return null
        val userId = user["id"].toString()

        // Create worker_profiles entry
        return db.queryForList(
            """INSERT INTO app.worker_profiles (user_id, full_name, created_at, updated_at)
               VALUES (?, ?, NOW(), NOW())
               ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW()
               RETURNING *""",
            userId, fullName
        ).firstOrNull()
    }

    fun updateWorker(id: String, body: Map<String, Any?>): Map<String, Any?>? {
        val worker = findWorkerById(id) ?: return null
        val userId = worker["user_id"] as String

        val profileClauses = mutableListOf<String>()
        val profileParams = mutableListOf<Any?>()

        nonBlank(body["fullName"] ?: body["full_name"])?.let { profileClauses.add("full_name = ?"); profileParams.add(it) }
        nonBlank(body["dateOfBirth"] ?: body["date_of_birth"])?.let { profileClauses.add("date_of_birth = ?"); profileParams.add(it) }
        nonBlank(body["gender"])?.let { profileClauses.add("gender = ?"); profileParams.add(it) }
        nonBlank(body["bio"])?.let { profileClauses.add("bio = ?"); profileParams.add(it) }
        nonBlank(body["primaryTradeId"] ?: body["primary_trade_id"])?.let { profileClauses.add("primary_trade_id = ?"); profileParams.add(it) }
        nonBlank(body["experienceMonths"] ?: body["experience_months"])?.let { profileClauses.add("experience_months = ?"); profileParams.add(it) }
        (body["profileComplete"] ?: body["profile_complete"])?.let { profileClauses.add("profile_complete = ?"); profileParams.add(it) }
        (body["idVerified"] ?: body["id_verified"])?.let { profileClauses.add("id_verified = ?"); profileParams.add(it) }
        nonBlank(body["idNumber"] ?: body["id_number"])?.let { profileClauses.add("id_number = ?"); profileParams.add(it) }
        nonBlank(body["bankName"] ?: body["bank_name"])?.let { profileClauses.add("bank_name = ?"); profileParams.add(it) }
        nonBlank(body["bankAccountNumber"] ?: body["bank_account_number"])?.let { profileClauses.add("bank_account_number = ?"); profileParams.add(it) }

        if (profileClauses.isNotEmpty()) {
            profileClauses.add("updated_at = NOW()")
            profileParams.add(id)
            db.updateRaw(
                "UPDATE app.worker_profiles SET ${profileClauses.joinToString(", ")} WHERE id = ?",
                *profileParams.toTypedArray()
            )
        }

        body["phone"]?.let { db.updateRaw("UPDATE auth.users SET phone = ?, updated_at = NOW() WHERE id = ?", it, userId) }
        body["status"]?.let { db.updateRaw("UPDATE auth.users SET status = ?, updated_at = NOW() WHERE id = ?", it, userId) }

        return findWorkerById(id)
    }

    fun deleteWorker(id: String): Int {
        val worker = db.queryForList(
            "SELECT user_id FROM app.worker_profiles WHERE id = ?", id
        ).firstOrNull() ?: return 0
        val userId = worker["user_id"] as String
        // Soft delete — set status to DELETED, data preserved for compliance/re-registration
        return db.update(
            "UPDATE auth.users SET status = 'DELETED', updated_at = NOW() WHERE id = ?",
            userId
        )
    }

    fun findWorkerTradeSkills(workerId: String): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT wts.*, t.name_ko, t.name_vi, t.name_en
               FROM app.worker_trade_skills wts
               JOIN ref.construction_trades t ON wts.trade_id = t.id
               WHERE wts.worker_id = ?
               ORDER BY t.name_ko""",
            workerId
        )
    }

    fun updateWorkerTradeSkills(workerId: String, skills: List<Map<String, Any?>>): List<Map<String, Any?>> {
        db.update("DELETE FROM app.worker_trade_skills WHERE worker_id = ?", workerId)
        for (skill in skills) {
            val tradeId = skill["tradeId"]?.toString() ?: continue
            val years = (skill["years"] as? Number)?.toInt() ?: 0
            db.updateRaw(
                """INSERT INTO app.worker_trade_skills (worker_id, trade_id, years)
                   VALUES (?, ?, ?)
                   ON CONFLICT (worker_id, trade_id) DO UPDATE SET years = EXCLUDED.years""",
                workerId, tradeId, years
            )
        }
        return findWorkerTradeSkills(workerId)
    }

    // ── Jobs ──────────────────────────────────────────────────────────────────

    fun findJobsPaginated(status: String?, search: String, page: Int, limit: Int): List<Map<String, Any?>> {
        val offset = (page - 1) * limit
        val baseQuery = """SELECT j.*, t.name_ko as trade_name_ko, t.name_vi as trade_name_vi,
                      cs.name as site_name, cs.address, cs.province,
                      cc.name as company_name
               FROM app.jobs j
               LEFT JOIN ref.construction_trades t ON j.trade_id = t.id
               LEFT JOIN app.construction_sites cs ON j.site_id = cs.id
               LEFT JOIN app.construction_companies cc ON cs.company_id = cc.id"""
        val hasStatus = !status.isNullOrBlank()
        val hasSearch = search.isNotBlank()
        val like = "%$search%"
        return when {
            !hasStatus && !hasSearch -> sanitizeList(db.queryForList(
                "$baseQuery ORDER BY j.created_at DESC LIMIT ? OFFSET ?", limit, offset))
            hasStatus && !hasSearch -> sanitizeList(db.queryForList(
                "$baseQuery WHERE j.status = ? ORDER BY j.created_at DESC LIMIT ? OFFSET ?",
                status, limit, offset))
            !hasStatus && hasSearch -> sanitizeList(db.queryForList(
                "$baseQuery WHERE (j.title ILIKE ? OR cs.name ILIKE ? OR cc.name ILIKE ?) ORDER BY j.created_at DESC LIMIT ? OFFSET ?",
                like, like, like, limit, offset))
            else -> sanitizeList(db.queryForList(
                "$baseQuery WHERE j.status = ? AND (j.title ILIKE ? OR cs.name ILIKE ? OR cc.name ILIKE ?) ORDER BY j.created_at DESC LIMIT ? OFFSET ?",
                status, like, like, like, limit, offset))
        }
    }

    fun countJobs(status: String?, search: String): Int {
        val hasStatus = !status.isNullOrBlank()
        val hasSearch = search.isNotBlank()
        val like = "%$search%"
        val rows = when {
            !hasStatus && !hasSearch -> db.queryForList("SELECT COUNT(*) as count FROM app.jobs")
            hasStatus && !hasSearch -> db.queryForList(
                "SELECT COUNT(*) as count FROM app.jobs WHERE status = ?", status)
            !hasStatus && hasSearch -> db.queryForList(
                """SELECT COUNT(*) as count FROM app.jobs j
                   LEFT JOIN app.construction_sites cs ON j.site_id = cs.id
                   LEFT JOIN app.construction_companies cc ON cs.company_id = cc.id
                   WHERE (j.title ILIKE ? OR cs.name ILIKE ? OR cc.name ILIKE ?)""", like, like, like)
            else -> db.queryForList(
                """SELECT COUNT(*) as count FROM app.jobs j
                   LEFT JOIN app.construction_sites cs ON j.site_id = cs.id
                   LEFT JOIN app.construction_companies cc ON cs.company_id = cc.id
                   WHERE j.status = ? AND (j.title ILIKE ? OR cs.name ILIKE ? OR cc.name ILIKE ?)""",
                status, like, like, like)
        }
        return (rows.firstOrNull()?.get("count") as? Number)?.toInt() ?: 0
    }

    fun findJobById(id: String): Map<String, Any?>? {
        return sanitizeList(db.queryForList(
            """SELECT j.*,
                      cs.name as site_name, cs.address, cs.province as province,
                      cc.name as company_name,
                      t.name_ko as trade_name_ko
               FROM app.jobs j
               LEFT JOIN app.construction_sites cs ON j.site_id = cs.id
               LEFT JOIN app.construction_companies cc ON cs.company_id = cc.id
               LEFT JOIN ref.construction_trades t ON j.trade_id = t.id
               WHERE j.id = ?""",
            id
        )).firstOrNull()
    }

    fun findJobRoster(jobId: String): List<Map<String, Any?>> {
        return sanitizeList(db.queryForList(
            """SELECT ja.id AS application_id,
                      ja.status AS application_status,
                      wp.full_name AS worker_name,
                      u.phone AS worker_phone,
                      wp.id_verified,
                      c.id AS contract_id,
                      c.status AS contract_status,
                      c.worker_signed_at,
                      c.manager_signed_at,
                      ar.id AS attendance_id,
                      ar.status AS attendance_status,
                      ar.check_in_time,
                      ar.check_out_time,
                      ar.hours_worked,
                      ar.notes AS attendance_notes
               FROM app.job_applications ja
               JOIN app.worker_profiles wp ON ja.worker_id = wp.id
               JOIN auth.users u ON wp.user_id = u.id
               LEFT JOIN app.contracts c ON c.application_id = ja.id
               LEFT JOIN app.attendance_records ar ON ar.worker_id = ja.worker_id AND ar.job_id = ja.job_id
               WHERE ja.job_id = ?
               ORDER BY ja.applied_at DESC""",
            jobId
        ))
    }

    fun createJob(body: Map<String, Any?>): Map<String, Any?>? {
        val siteId = body["siteId"] as? String ?: body["site_id"] as? String ?: ""
        val title = body["title"] as? String ?: ""
        val description = body["description"] as? String
        val tradeId = body["tradeId"] ?: body["trade_id"]
        val workDate = body["workDate"] as? String ?: body["work_date"] as? String
        val startTime = body["startTime"] as? String ?: body["start_time"] as? String
        val endTime = body["endTime"] as? String ?: body["end_time"] as? String
        val dailyWage = body["dailyWage"] ?: body["daily_wage"]
        val slotsTotal = (body["slotsTotal"] ?: body["slots_total"] as? Number)?.let { (it as Number).toInt() } ?: 1
        val status = body["status"] as? String ?: "OPEN"
        val slug = title.lowercase()
            .replace(Regex("[^a-z0-9\\s-]"), "")
            .trim()
            .replace(Regex("\\s+"), "-")
            .take(80) + "-" + System.currentTimeMillis().toString(36)

        // Look up manager from site
        val managerId = db.queryForList(
            "SELECT manager_id FROM app.construction_sites WHERE id = ?", siteId
        ).firstOrNull()?.get("manager_id") as? String

        val benefitsJson = toJsonStr(body["benefits"])
        val requirementsJson = toJsonStr(body["requirements"] ?: body["requirementsObj"])
        return db.queryForListRaw(
            """INSERT INTO app.jobs (site_id, manager_id, title, description, trade_id, work_date,
                      start_time, end_time, daily_wage, slots_total, status, slug, benefits, requirements,
                      published_at, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), NOW(), NOW(), NOW())
               RETURNING *""",
            siteId, managerId, title, description, tradeId, workDate,
            startTime, endTime, dailyWage, slotsTotal, status, slug,
            benefitsJson, requirementsJson
        ).firstOrNull()
    }

    fun updateJob(id: String, body: Map<String, Any?>): Map<String, Any?>? {
        val setClauses = mutableListOf<String>()
        val params = mutableListOf<Any?>()

        (body["siteId"] ?: body["site_id"])?.let { setClauses.add("site_id = ?"); params.add(it) }
        body["title"]?.let { setClauses.add("title = ?"); params.add(it) }
        body["description"]?.let { setClauses.add("description = ?"); params.add(it) }
        (body["tradeId"] ?: body["trade_id"])?.let { setClauses.add("trade_id = ?"); params.add(it) }
        (body["workDate"] ?: body["work_date"])?.let { setClauses.add("work_date = ?"); params.add(it) }
        (body["startTime"] ?: body["start_time"])?.let { setClauses.add("start_time = ?"); params.add(it) }
        (body["endTime"] ?: body["end_time"])?.let { setClauses.add("end_time = ?"); params.add(it) }
        (body["dailyWage"] ?: body["daily_wage"])?.let { setClauses.add("daily_wage = ?"); params.add(it) }
        (body["slotsTotal"] ?: body["slots_total"])?.let { setClauses.add("slots_total = ?"); params.add((it as Number).toInt()) }
        body["status"]?.let { setClauses.add("status = ?"); params.add(it) }
        body["benefits"]?.let { setClauses.add("benefits = CAST(? AS jsonb)"); params.add(toJsonStr(it)) }
        (body["requirements"] ?: body["requirementsObj"])?.let { setClauses.add("requirements = CAST(? AS jsonb)"); params.add(toJsonStr(it)) }

        if (setClauses.isEmpty()) return findJobById(id)

        setClauses.add("updated_at = NOW()")
        params.add(id)
        return db.queryForListRaw(
            "UPDATE app.jobs SET ${setClauses.joinToString(", ")} WHERE id = ? RETURNING *",
            *params.toTypedArray()
        ).firstOrNull()
    }

    fun deleteJob(id: String): Int {
        return db.update("DELETE FROM app.jobs WHERE id = ?", id)
    }

    fun updateApplicationStatus(applicationId: String, status: String): Map<String, Any?>? {
        return db.queryForList(
            """UPDATE app.job_applications SET status = ?, updated_at = NOW()
               WHERE id = ? RETURNING *""",
            status, applicationId
        ).firstOrNull()
    }

    fun findContractsByWorkerProfileId(workerProfileId: String): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT c.id, c.status, c.created_at, c.worker_signed_at, c.manager_signed_at,
                      j.title AS job_title, j.work_date, j.daily_wage,
                      s.name  AS site_name
               FROM app.contracts c
               JOIN app.jobs j ON c.job_id = j.id
               JOIN app.construction_sites s ON j.site_id = s.id
               WHERE c.worker_id = ?
               ORDER BY c.created_at DESC""",
            workerProfileId
        )
    }

    // ── Sites ─────────────────────────────────────────────────────────────────

    fun findAllSites(): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT cs.id, cs.manager_id, cs.company_id, cs.name, cs.address, cs.province,
                      cs.district, cs.lat, cs.lng, cs.site_type, cs.status, cs.created_at, cs.updated_at,
                      cc.name    AS company_name,
                      mp.representative_name AS manager_name,
                      mp.contact_phone       AS manager_phone,
                      mp.id                  AS manager_profile_id,
                      COUNT(j.id)                                           AS job_count,
                      COUNT(j.id) FILTER (WHERE j.status = 'OPEN')         AS open_job_count
               FROM app.construction_sites cs
               LEFT JOIN app.construction_companies cc ON cs.company_id = cc.id
               LEFT JOIN app.manager_profiles mp ON cs.manager_id = mp.id
               LEFT JOIN app.jobs j ON j.site_id = cs.id
               GROUP BY cs.id, cc.name, mp.representative_name, mp.contact_phone, mp.id
               ORDER BY cs.name"""
        )
    }

    fun searchSitesPaginated(search: String, page: Int, limit: Int): List<Map<String, Any?>> {
        val offset = (page - 1) * limit
        val base = """SELECT cs.id, cs.manager_id, cs.company_id, cs.name, cs.address, cs.province,
                      cs.district, cs.lat, cs.lng, cs.site_type, cs.status, cs.created_at, cs.updated_at,
                      cc.name    AS company_name,
                      mp.representative_name AS manager_name,
                      mp.contact_phone       AS manager_phone,
                      mp.id                  AS manager_profile_id,
                      COUNT(j.id)                                           AS job_count,
                      COUNT(j.id) FILTER (WHERE j.status = 'OPEN')         AS open_job_count
               FROM app.construction_sites cs
               LEFT JOIN app.construction_companies cc ON cs.company_id = cc.id
               LEFT JOIN app.manager_profiles mp ON cs.manager_id = mp.id
               LEFT JOIN app.jobs j ON j.site_id = cs.id"""
        return if (search.isBlank()) {
            db.queryForList("$base GROUP BY cs.id, cc.name, mp.representative_name, mp.contact_phone, mp.id ORDER BY cs.created_at DESC LIMIT ? OFFSET ?", limit, offset)
        } else {
            val like = "%$search%"
            db.queryForList("$base WHERE cs.name ILIKE ? OR cs.address ILIKE ? OR cs.province ILIKE ? OR cc.name ILIKE ? GROUP BY cs.id, cc.name, mp.representative_name, mp.contact_phone, mp.id ORDER BY cs.created_at DESC LIMIT ? OFFSET ?",
                like, like, like, like, limit, offset)
        }
    }

    fun countSites(search: String): Int {
        val base = """SELECT COUNT(DISTINCT cs.id) as count FROM app.construction_sites cs
               LEFT JOIN app.construction_companies cc ON cs.company_id = cc.id"""
        val rows = if (search.isBlank()) {
            db.queryForList(base)
        } else {
            val like = "%$search%"
            db.queryForList("$base WHERE cs.name ILIKE ? OR cs.address ILIKE ? OR cs.province ILIKE ? OR cc.name ILIKE ?", like, like, like, like)
        }
        return (rows.firstOrNull()?.get("count") as? Number)?.toInt() ?: 0
    }

    fun findSiteById(id: String): Map<String, Any?>? {
        val site = db.queryForList(
            """SELECT cs.id, cs.manager_id, cs.company_id, cs.name, cs.address, cs.province,
                      cs.district, cs.lat, cs.lng, cs.site_type, cs.status, cs.created_at, cs.updated_at,
                      cc.name          AS company_name,
                      cc.contact_name  AS company_contact_name,
                      cc.contact_phone AS company_contact_phone,
                      cc.contact_email AS company_contact_email,
                      mp.representative_name AS manager_name,
                      mp.contact_phone       AS manager_phone,
                      mp.id                  AS manager_profile_id
               FROM app.construction_sites cs
               LEFT JOIN app.construction_companies cc ON cs.company_id = cc.id
               LEFT JOIN app.manager_profiles mp ON cs.manager_id = mp.id
               WHERE cs.id = ?""",
            id
        ).firstOrNull() ?: return null

        val jobs = db.queryForList(
            """SELECT j.id, j.title, j.status, j.work_date, j.daily_wage, j.slots_total, j.slots_filled,
                      COUNT(ja.id) FILTER (WHERE ja.status IN ('PENDING','ACCEPTED')) AS application_count,
                      COUNT(ja.id) FILTER (WHERE ja.status = 'ACCEPTED')              AS hired_count
               FROM app.jobs j
               LEFT JOIN app.job_applications ja ON ja.job_id = j.id
               WHERE j.site_id = ?
               GROUP BY j.id
               ORDER BY j.work_date DESC""",
            id
        )

        return site + mapOf("jobs" to jobs)
    }

    fun createSite(body: Map<String, Any?>): Map<String, Any?>? {
        val name = body["name"] as? String ?: ""
        val address = body["address"] as? String
        val province = body["province"] as? String
        val district = body["district"] as? String
        val siteType = body["siteType"] as? String ?: body["site_type"] as? String
        val companyId = (body["companyId"] as? String ?: body["company_id"] as? String)?.ifBlank { null }
        val managerId = (body["managerId"] as? String ?: body["manager_id"] as? String)?.ifBlank { null }
        val status = body["status"] as? String ?: "ACTIVE"

        return db.queryForListRaw(
            """INSERT INTO app.construction_sites (name, address, province, district, site_type, company_id, manager_id, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
               RETURNING *""",
            name, address, province, district, siteType, companyId, managerId, status
        ).firstOrNull()
    }

    fun updateSite(id: String, body: Map<String, Any?>): Map<String, Any?>? {
        val setClauses = mutableListOf<String>()
        val params = mutableListOf<Any?>()

        body["name"]?.let { setClauses.add("name = ?"); params.add(it) }
        body["address"]?.let { setClauses.add("address = ?"); params.add(it) }
        body["province"]?.let { setClauses.add("province = ?"); params.add(it) }
        body["district"]?.let { setClauses.add("district = ?"); params.add(it) }
        (body["siteType"] ?: body["site_type"])?.let { setClauses.add("site_type = ?"); params.add(it) }
        (body["companyId"] ?: body["company_id"])?.let { setClauses.add("company_id = ?"); params.add((it as String).ifBlank { null }) }
        (body["managerId"] ?: body["manager_id"])?.let { setClauses.add("manager_id = ?"); params.add((it as String).ifBlank { null }) }
        body["status"]?.let { setClauses.add("status = ?"); params.add(it) }

        if (setClauses.isEmpty()) return findSiteById(id)

        setClauses.add("updated_at = NOW()")
        params.add(id)
        return db.queryForListRaw(
            "UPDATE app.construction_sites SET ${setClauses.joinToString(", ")} WHERE id = ? RETURNING *",
            *params.toTypedArray()
        ).firstOrNull()
    }

    fun deleteSite(id: String): Int {
        return db.update("DELETE FROM app.construction_sites WHERE id = ?", id)
    }

    // ── Companies ─────────────────────────────────────────────────────────────

    fun findAllCompanies(): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT cc.*, COUNT(cs.id) AS site_count
               FROM app.construction_companies cc
               LEFT JOIN app.construction_sites cs ON cs.company_id = cc.id
               GROUP BY cc.id
               ORDER BY cc.name"""
        )
    }

    fun searchCompaniesPaginated(search: String, page: Int, limit: Int): List<Map<String, Any?>> {
        val offset = (page - 1) * limit
        // Join through auth.users to bridge TEXT firebase_uid → UUID manager_profiles.user_id
        val base = """SELECT cc.*,
                      COUNT(cs.id) AS site_count,
                      mp.representative_name AS creator_name,
                      mp.contact_phone       AS creator_phone
               FROM app.construction_companies cc
               LEFT JOIN app.construction_sites cs ON cs.company_id = cc.id
               LEFT JOIN auth.users au ON au.firebase_uid = cc.created_by_user_id
               LEFT JOIN app.manager_profiles mp ON mp.user_id = au.id"""
        val rows = if (search.isBlank()) {
            db.queryForList("$base GROUP BY cc.id, mp.representative_name, mp.contact_phone ORDER BY cc.created_at DESC LIMIT ? OFFSET ?", limit, offset)
        } else {
            val like = "%$search%"
            db.queryForList(
                "$base WHERE (cc.name ILIKE ? OR cc.business_reg_no ILIKE ? OR cc.contact_name ILIKE ?) GROUP BY cc.id, mp.representative_name, mp.contact_phone ORDER BY cc.created_at DESC LIMIT ? OFFSET ?",
                like, like, like, limit, offset)
        }
        return rows.map { row -> row + mapOf("signature_url" to toUrl(row["signature_s3_key"] as? String)) }
    }

    fun countCompanies(search: String): Int {
        val rows = if (search.isBlank()) {
            db.queryForList("SELECT COUNT(*) as count FROM app.construction_companies")
        } else {
            val like = "%$search%"
            db.queryForList(
                "SELECT COUNT(*) as count FROM app.construction_companies WHERE name ILIKE ? OR business_reg_no ILIKE ? OR contact_name ILIKE ?",
                like, like, like)
        }
        return (rows.firstOrNull()?.get("count") as? Number)?.toInt() ?: 0
    }

    fun findCompanyById(id: String): Map<String, Any?>? {
        val row = db.queryForList(
            """SELECT cc.*, COUNT(cs.id) AS site_count
               FROM app.construction_companies cc
               LEFT JOIN app.construction_sites cs ON cs.company_id = cc.id
               WHERE cc.id = ?
               GROUP BY cc.id""",
            id
        ).firstOrNull() ?: return null
        return row + mapOf(
            "signature_url" to toUrl(row["signature_s3_key"] as? String),
            "business_reg_cert_url" to toUrl(row["business_reg_cert_s3_key"] as? String),
        )
    }

    fun createCompany(body: Map<String, Any?>): Map<String, Any?>? {
        val name = body["name"] as? String ?: ""
        val businessRegNo = (body["businessRegNo"] as? String ?: body["business_reg_no"] as? String)?.ifBlank { null }
        val contactName = (body["contactName"] as? String ?: body["contact_name"] as? String)?.ifBlank { null }
        val contactPhone = (body["contactPhone"] as? String ?: body["contact_phone"] as? String)?.ifBlank { null }
        val contactEmail = (body["contactEmail"] as? String ?: body["contact_email"] as? String)?.ifBlank { null }

        return db.queryForListRaw(
            """INSERT INTO app.construction_companies (name, business_reg_no, contact_name, contact_phone, contact_email, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, NOW(), NOW())
               RETURNING *""",
            name, businessRegNo, contactName, contactPhone, contactEmail
        ).firstOrNull()
    }

    fun updateCompany(id: String, body: Map<String, Any?>): Map<String, Any?>? {
        val setClauses = mutableListOf<String>()
        val params = mutableListOf<Any?>()

        body["name"]?.let { setClauses.add("name = ?"); params.add(it) }
        (body["businessRegNo"] ?: body["business_reg_no"])?.let { setClauses.add("business_reg_no = ?"); params.add(it) }
        (body["contactName"] ?: body["contact_name"])?.let { setClauses.add("contact_name = ?"); params.add(it) }
        (body["contactPhone"] ?: body["contact_phone"])?.let { setClauses.add("contact_phone = ?"); params.add(it) }
        (body["contactEmail"] ?: body["contact_email"])?.let { setClauses.add("contact_email = ?"); params.add(it) }
        // Signature S3 key: set to new key, or NULL if clearSeal=true
        if (body.containsKey("clearSeal") && body["clearSeal"] == true) {
            setClauses.add("signature_s3_key = NULL")
        } else {
            (body["signatureS3Key"] as? String)?.let { setClauses.add("signature_s3_key = ?"); params.add(it) }
        }

        if (setClauses.isEmpty()) return findCompanyById(id)

        setClauses.add("updated_at = NOW()")
        params.add(id)
        return db.queryForListRaw(
            "UPDATE app.construction_companies SET ${setClauses.joinToString(", ")} WHERE id = ? RETURNING *",
            *params.toTypedArray()
        ).firstOrNull()
    }

    fun deleteCompany(id: String): Int {
        return db.update("DELETE FROM app.construction_companies WHERE id = ?", id)
    }

    // ── Trades ────────────────────────────────────────────────────────────────

    fun findAllTrades(): List<Map<String, Any?>> {
        return db.queryForList(
            "SELECT * FROM ref.construction_trades ORDER BY name_ko"
        )
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    fun searchUsers(search: String, role: String, limit: Int = 30): List<Map<String, Any?>> {
        val like = "%$search%"
        return if (role.isNotBlank()) {
            db.queryForList(
                """SELECT u.id AS user_id,
                          COALESCE(wp.full_name, mp.representative_name, u.phone, u.email) AS name,
                          u.phone, u.email, u.role
                   FROM auth.users u
                   LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
                   LEFT JOIN app.manager_profiles mp ON mp.user_id = u.id
                   WHERE (
                     COALESCE(wp.full_name, mp.representative_name, u.phone, u.email) ILIKE ?
                     OR u.phone ILIKE ?
                     OR u.email ILIKE ?
                   ) AND u.role = ?
                   ORDER BY u.created_at DESC
                   LIMIT ?""",
                like, like, like, role, limit
            )
        } else {
            db.queryForList(
                """SELECT u.id AS user_id,
                          COALESCE(wp.full_name, mp.representative_name, u.phone, u.email) AS name,
                          u.phone, u.email, u.role
                   FROM auth.users u
                   LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
                   LEFT JOIN app.manager_profiles mp ON mp.user_id = u.id
                   WHERE (
                     COALESCE(wp.full_name, mp.representative_name, u.phone, u.email) ILIKE ?
                     OR u.phone ILIKE ?
                     OR u.email ILIKE ?
                   )
                   ORDER BY u.created_at DESC
                   LIMIT ?""",
                like, like, like, limit
            )
        }
    }

    fun getUsersByRole(role: String): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT u.id AS user_id,
                      COALESCE(wp.full_name, mp.representative_name, u.phone, u.email) AS name,
                      u.phone, u.email, u.role
               FROM auth.users u
               LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
               LEFT JOIN app.manager_profiles mp ON mp.user_id = u.id
               WHERE u.role = ?
               ORDER BY u.created_at DESC""",
            role
        )
    }

    fun getUserPhones(userIds: List<String>): List<Map<String, Any?>> {
        if (userIds.isEmpty()) return emptyList()
        val placeholders = userIds.joinToString(",") { "?" }
        return db.queryForList(
            "SELECT id AS user_id, phone FROM auth.users WHERE id IN ($placeholders) AND phone IS NOT NULL",
            *userIds.toTypedArray()
        )
    }

    fun findPushSchedules(): List<Map<String, Any?>> {
        return db.queryForList(
            "SELECT * FROM ops.push_schedules ORDER BY scheduled_at DESC LIMIT 100"
        )
    }

    fun createPushSchedule(
        title: String,
        body: String,
        targetUserIds: List<String>?,
        targetRole: String?,
        scheduledAt: String
    ): Map<String, Any?>? {
        val userIdsArray = if (targetUserIds != null) {
            "{${targetUserIds.joinToString(",")}}"
        } else null

        return db.queryForListRaw(
            """INSERT INTO ops.push_schedules
                 (title, body, target_user_ids, target_role, scheduled_at, status, created_by)
               VALUES (?, ?, ?, ?, ?, 'PENDING', 'admin')
               RETURNING *""",
            title, body, userIdsArray, targetRole, scheduledAt
        ).firstOrNull()
    }

    fun cancelPushSchedule(id: String): Map<String, Any?>? {
        return db.queryForList(
            """UPDATE ops.push_schedules SET status = 'CANCELLED', updated_at = NOW()
               WHERE id = ? AND status = 'PENDING' RETURNING *""",
            id
        ).firstOrNull()
    }
}
