package vn.gada.api.admin

import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService

@Repository
class AdminRepository(private val db: DatabaseService) {

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
