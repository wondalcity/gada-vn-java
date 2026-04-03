package vn.gada.api.admin

import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService

@Repository
class AdminRepository(private val db: DatabaseService) {

    /** Convert PgArray fields (e.g. TEXT[]) to List so Jackson can serialize them. */
    private fun sanitize(row: Map<String, Any?>): Map<String, Any?> =
        row.mapValues { (_, v) ->
            when (v) {
                is java.sql.Array -> (v.array as? Array<*>)?.toList() ?: emptyList<Any>()
                else -> v
            }
        }

    private fun sanitizeList(rows: List<Map<String, Any?>>): List<Map<String, Any?>> =
        rows.map { sanitize(it) }

    // ── Managers ─────────────────────────────────────────────────────────────

    fun findManagersPaginated(status: String, page: Int, limit: Int): List<Map<String, Any?>> {
        val offset = (page - 1) * limit
        return db.queryForList(
            """SELECT mp.*, u.phone, u.created_at as user_created_at
               FROM app.manager_profiles mp
               JOIN auth.users u ON mp.user_id = u.id
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
        return db.queryForList(
            """SELECT mp.*, u.phone, u.created_at as user_created_at
               FROM app.manager_profiles mp
               JOIN auth.users u ON mp.user_id = u.id
               WHERE mp.id = ?""",
            id
        ).firstOrNull()
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
            """SELECT cs.*, msa.created_at as assigned_at
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

    fun searchWorkers(search: String, limit: Int): List<Map<String, Any?>> {
        val like = "%$search%"
        return if (search.isBlank()) {
            db.queryForList(
                """SELECT wp.*, u.phone, u.email, u.status as user_status, u.created_at as user_created_at
                   FROM app.worker_profiles wp
                   JOIN auth.users u ON wp.user_id = u.id
                   ORDER BY wp.created_at DESC
                   LIMIT ?""",
                limit
            )
        } else {
            db.queryForList(
                """SELECT wp.*, u.phone, u.email, u.status as user_status, u.created_at as user_created_at
                   FROM app.worker_profiles wp
                   JOIN auth.users u ON wp.user_id = u.id
                   WHERE wp.full_name ILIKE ? OR u.phone ILIKE ? OR u.email ILIKE ?
                   ORDER BY wp.created_at DESC
                   LIMIT ?""",
                like, like, like, limit
            )
        }
    }

    fun findWorkerById(id: String): Map<String, Any?>? {
        return db.queryForList(
            """SELECT wp.*, u.phone, u.email, u.status as user_status, u.created_at as user_created_at
               FROM app.worker_profiles wp
               JOIN auth.users u ON wp.user_id = u.id
               WHERE wp.id = ?""",
            id
        ).firstOrNull()
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
        val userId = user["id"] as String

        // Create worker_profiles entry
        return db.queryForList(
            """INSERT INTO app.worker_profiles (user_id, full_name, created_at, updated_at)
               VALUES (?, ?, NOW(), NOW())
               ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW()
               RETURNING *""",
            userId, fullName
        ).firstOrNull()
    }

    fun updateWorker(id: String, name: String?, phone: String?, status: String?): Map<String, Any?>? {
        val worker = findWorkerById(id) ?: return null
        val userId = worker["user_id"] as String

        if (name != null) {
            db.updateRaw("UPDATE app.worker_profiles SET full_name = ?, updated_at = NOW() WHERE id = ?", name, id)
        }
        if (phone != null) {
            db.updateRaw("UPDATE auth.users SET phone = ?, updated_at = NOW() WHERE id = ?", phone, userId)
        }
        if (status != null) {
            db.updateRaw("UPDATE auth.users SET status = ?, updated_at = NOW() WHERE id = ?", status, userId)
        }
        return findWorkerById(id)
    }

    fun deleteWorker(id: String): Int {
        val worker = db.queryForList(
            "SELECT user_id FROM app.worker_profiles WHERE id = ?", id
        ).firstOrNull() ?: return 0
        val userId = worker["user_id"] as String
        db.update("DELETE FROM app.worker_profiles WHERE id = ?", id)
        return db.update("DELETE FROM auth.users WHERE id = ?", userId)
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
            val level = skill["level"]?.toString() ?: "BEGINNER"
            db.updateRaw(
                """INSERT INTO app.worker_trade_skills (worker_id, trade_id, level, created_at, updated_at)
                   VALUES (?, ?, ?, NOW(), NOW())
                   ON CONFLICT (worker_id, trade_id) DO UPDATE SET level = EXCLUDED.level, updated_at = NOW()""",
                workerId, tradeId, level
            )
        }
        return findWorkerTradeSkills(workerId)
    }

    // ── Jobs ──────────────────────────────────────────────────────────────────

    fun findJobsPaginated(status: String?, page: Int, limit: Int): List<Map<String, Any?>> {
        val offset = (page - 1) * limit
        return if (status.isNullOrBlank()) {
            sanitizeList(db.queryForList(
                """SELECT j.*, t.name_ko as trade_name_ko, t.name_vi as trade_name_vi
                   FROM app.jobs j
                   LEFT JOIN ref.construction_trades t ON j.trade_id = t.id
                   ORDER BY j.created_at DESC
                   LIMIT ? OFFSET ?""",
                limit, offset
            ))
        } else {
            sanitizeList(db.queryForList(
                """SELECT j.*, t.name_ko as trade_name_ko, t.name_vi as trade_name_vi
                   FROM app.jobs j
                   LEFT JOIN ref.construction_trades t ON j.trade_id = t.id
                   WHERE j.status = ?
                   ORDER BY j.created_at DESC
                   LIMIT ? OFFSET ?""",
                status, limit, offset
            ))
        }
    }

    fun countJobs(status: String?): Int {
        val rows = if (status.isNullOrBlank()) {
            db.queryForList("SELECT COUNT(*) as count FROM app.jobs")
        } else {
            db.queryForList("SELECT COUNT(*) as count FROM app.jobs WHERE status = ?", status)
        }
        return (rows.firstOrNull()?.get("count") as? Number)?.toInt() ?: 0
    }

    fun findJobRoster(jobId: String): List<Map<String, Any?>> {
        return sanitizeList(db.queryForList(
            """SELECT ja.*, wp.full_name as worker_name, u.phone as worker_phone
               FROM app.job_applications ja
               JOIN app.worker_profiles wp ON ja.worker_id = wp.id
               JOIN auth.users u ON wp.user_id = u.id
               WHERE ja.job_id = ?
               ORDER BY ja.created_at DESC""",
            jobId
        ))
    }

    fun createJob(body: Map<String, Any?>): Map<String, Any?>? {
        val titleKo = body["titleKo"] as? String ?: body["title_ko"] as? String ?: ""
        val titleVi = body["titleVi"] as? String ?: body["title_vi"] as? String ?: ""
        val provinceSlug = body["provinceSlug"] as? String ?: body["province_slug"] as? String
        val tradeId = body["tradeId"] as? String ?: body["trade_id"] as? String
        val status = body["status"] as? String ?: "OPEN"
        val dailyWage = body["dailyWage"] ?: body["daily_wage"]
        val startDate = body["startDate"] as? String ?: body["start_date"] as? String
        val endDate = body["endDate"] as? String ?: body["end_date"] as? String
        val createdBy = body["createdBy"] as? String ?: body["created_by"] as? String

        return db.queryForListRaw(
            """INSERT INTO app.jobs (title_ko, title_vi, province_slug, trade_id, status, daily_wage, start_date, end_date, created_by, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
               RETURNING *""",
            titleKo, titleVi, provinceSlug, tradeId, status, dailyWage, startDate, endDate, createdBy
        ).firstOrNull()
    }

    fun updateJob(id: String, body: Map<String, Any?>): Map<String, Any?>? {
        val setClauses = mutableListOf<String>()
        val params = mutableListOf<Any?>()

        body["titleKo"]?.let { setClauses.add("title_ko = ?"); params.add(it) }
        body["title_ko"]?.let { if (!body.containsKey("titleKo")) { setClauses.add("title_ko = ?"); params.add(it) } }
        body["titleVi"]?.let { setClauses.add("title_vi = ?"); params.add(it) }
        body["title_vi"]?.let { if (!body.containsKey("titleVi")) { setClauses.add("title_vi = ?"); params.add(it) } }
        body["provinceSlug"]?.let { setClauses.add("province_slug = ?"); params.add(it) }
        body["province_slug"]?.let { if (!body.containsKey("provinceSlug")) { setClauses.add("province_slug = ?"); params.add(it) } }
        body["tradeId"]?.let { setClauses.add("trade_id = ?"); params.add(it) }
        body["trade_id"]?.let { if (!body.containsKey("tradeId")) { setClauses.add("trade_id = ?"); params.add(it) } }
        body["status"]?.let { setClauses.add("status = ?"); params.add(it) }
        body["dailyWage"]?.let { setClauses.add("daily_wage = ?"); params.add(it) }
        body["daily_wage"]?.let { if (!body.containsKey("dailyWage")) { setClauses.add("daily_wage = ?"); params.add(it) } }
        body["startDate"]?.let { setClauses.add("start_date = ?"); params.add(it) }
        body["start_date"]?.let { if (!body.containsKey("startDate")) { setClauses.add("start_date = ?"); params.add(it) } }
        body["endDate"]?.let { setClauses.add("end_date = ?"); params.add(it) }
        body["end_date"]?.let { if (!body.containsKey("endDate")) { setClauses.add("end_date = ?"); params.add(it) } }

        if (setClauses.isEmpty()) return db.queryForList("SELECT * FROM app.jobs WHERE id = ?", id).firstOrNull()

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

    // ── Sites ─────────────────────────────────────────────────────────────────

    fun findAllSites(): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT cs.*, cc.name as company_name
               FROM app.construction_sites cs
               LEFT JOIN app.construction_companies cc ON cs.company_id = cc.id
               ORDER BY cs.name"""
        )
    }

    fun findSiteById(id: String): Map<String, Any?>? {
        return db.queryForList(
            """SELECT cs.*, cc.name as company_name
               FROM app.construction_sites cs
               LEFT JOIN app.construction_companies cc ON cs.company_id = cc.id
               WHERE cs.id = ?""",
            id
        ).firstOrNull()
    }

    fun createSite(body: Map<String, Any?>): Map<String, Any?>? {
        val name = body["name"] as? String ?: ""
        val address = body["address"] as? String
        val provinceSlug = body["provinceSlug"] as? String ?: body["province_slug"] as? String
        val companyId = body["companyId"] as? String ?: body["company_id"] as? String
        val managerId = body["managerId"] as? String ?: body["manager_id"] as? String
        val status = body["status"] as? String ?: "ACTIVE"

        return db.queryForListRaw(
            """INSERT INTO app.construction_sites (name, address, province_slug, company_id, manager_id, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
               RETURNING *""",
            name, address, provinceSlug, companyId, managerId, status
        ).firstOrNull()
    }

    fun updateSite(id: String, body: Map<String, Any?>): Map<String, Any?>? {
        val setClauses = mutableListOf<String>()
        val params = mutableListOf<Any?>()

        body["name"]?.let { setClauses.add("name = ?"); params.add(it) }
        body["address"]?.let { setClauses.add("address = ?"); params.add(it) }
        body["provinceSlug"]?.let { setClauses.add("province_slug = ?"); params.add(it) }
        body["province_slug"]?.let { if (!body.containsKey("provinceSlug")) { setClauses.add("province_slug = ?"); params.add(it) } }
        body["companyId"]?.let { setClauses.add("company_id = ?"); params.add(it) }
        body["company_id"]?.let { if (!body.containsKey("companyId")) { setClauses.add("company_id = ?"); params.add(it) } }
        body["managerId"]?.let { setClauses.add("manager_id = ?"); params.add(it) }
        body["manager_id"]?.let { if (!body.containsKey("managerId")) { setClauses.add("manager_id = ?"); params.add(it) } }
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
            "SELECT * FROM app.construction_companies ORDER BY name"
        )
    }

    fun findCompanyById(id: String): Map<String, Any?>? {
        return db.queryForList(
            "SELECT * FROM app.construction_companies WHERE id = ?",
            id
        ).firstOrNull()
    }

    fun createCompany(body: Map<String, Any?>): Map<String, Any?>? {
        val name = body["name"] as? String ?: ""
        val phone = body["phone"] as? String
        val address = body["address"] as? String

        return db.queryForListRaw(
            """INSERT INTO app.construction_companies (name, phone, address, created_at, updated_at)
               VALUES (?, ?, ?, NOW(), NOW())
               RETURNING *""",
            name, phone, address
        ).firstOrNull()
    }

    fun updateCompany(id: String, body: Map<String, Any?>): Map<String, Any?>? {
        val setClauses = mutableListOf<String>()
        val params = mutableListOf<Any?>()

        body["name"]?.let { setClauses.add("name = ?"); params.add(it) }
        body["phone"]?.let { setClauses.add("phone = ?"); params.add(it) }
        body["address"]?.let { setClauses.add("address = ?"); params.add(it) }

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
