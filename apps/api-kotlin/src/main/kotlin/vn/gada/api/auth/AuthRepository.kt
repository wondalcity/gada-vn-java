package vn.gada.api.auth

import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService

@Repository
class AuthRepository(private val db: DatabaseService) {

    fun findByFirebaseUid(firebaseUid: String): Map<String, Any?>? {
        val rows = db.queryForList(
            "SELECT * FROM auth.users WHERE firebase_uid = ?",
            firebaseUid
        )
        return rows.firstOrNull()
    }

    fun findById(userId: String): Map<String, Any?>? {
        val rows = db.queryForList(
            "SELECT * FROM auth.users WHERE id = ?",
            userId
        )
        return rows.firstOrNull()
    }

    fun findByPhone(phone: String): Map<String, Any?>? {
        val rows = db.queryForList(
            "SELECT * FROM auth.users WHERE phone = ?",
            phone
        )
        return rows.firstOrNull()
    }

    fun findByEmail(email: String): Map<String, Any?>? {
        val rows = db.queryForList(
            "SELECT * FROM auth.users WHERE email = ?",
            email
        )
        return rows.firstOrNull()
    }

    fun create(firebaseUid: String, phone: String?, email: String?, role: String): Map<String, Any?> {
        val rows = db.queryForListRaw(
            """INSERT INTO auth.users (firebase_uid, phone, email, role)
               VALUES (?, ?, ?, ?)
               RETURNING *""",
            firebaseUid, phone, email, role
        )
        return rows.first()
    }

    fun updateFirebaseUid(userId: String, firebaseUid: String) {
        db.updateRaw(
            "UPDATE auth.users SET firebase_uid = ?, updated_at = NOW() WHERE id = ?",
            firebaseUid, userId
        )
    }

    fun updateRole(userId: String, role: String): Map<String, Any?>? {
        val rows = db.queryForList(
            "UPDATE auth.users SET role = ?, updated_at = NOW() WHERE id = ? RETURNING *",
            role, userId
        )
        return rows.firstOrNull()
    }

    fun upsertFcmToken(userId: String, token: String, platform: String) {
        db.updateRaw(
            """INSERT INTO ops.fcm_tokens (user_id, token, platform, last_seen_at)
               VALUES (?, ?, ?, NOW())
               ON CONFLICT (user_id, token) DO UPDATE SET last_seen_at = NOW(), platform = ?""",
            userId, token, platform, platform
        )
    }

    fun getMeProfile(userId: String): Map<String, Any?>? {
        val rows = db.queryForList(
            """SELECT
                 u.id, u.firebase_uid, u.phone, u.email, u.role, u.status,
                 u.created_at, u.updated_at,
                 wp.full_name as worker_name,
                 mp.approval_status as manager_status
               FROM auth.users u
               LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
               LEFT JOIN app.manager_profiles mp ON mp.user_id = u.id
               WHERE u.id = ?""",
            userId
        )
        val r = rows.firstOrNull() ?: return null
        return mapOf(
            "id" to r["id"],
            "firebaseUid" to r["firebase_uid"],
            "name" to (r["worker_name"] ?: r["phone"] ?: r["email"] ?: "User"),
            "phone" to r["phone"],
            "email" to r["email"],
            "locale" to "ko",
            "status" to r["status"],
            "isWorker" to (r["role"] == "WORKER"),
            "isManager" to (r["role"] == "MANAGER"),
            "isAdmin" to (r["role"] == "ADMIN"),
            "managerStatus" to r["manager_status"],
            "roles" to listOf(r["role"]?.toString() ?: "WORKER")
        )
    }

    fun ensureWorkerProfile(userId: String, nameOrPhone: String?) {
        val displayName = nameOrPhone?.trim() ?: ""
        db.updateRaw(
            """INSERT INTO app.worker_profiles (user_id, full_name)
               VALUES (?, ?)
               ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name
               WHERE app.worker_profiles.full_name = '' OR app.worker_profiles.full_name LIKE '+%'""",
            userId, displayName
        )
    }

    /**
     * Reactivate a soft-deleted user as a fresh registration.
     * Resets status to ACTIVE and clears the worker_profile so it's rebuilt cleanly.
     */
    fun reactivateUser(userId: String, nameOrPhone: String?) {
        db.update("UPDATE auth.users SET status = 'ACTIVE', updated_at = NOW() WHERE id = ?", userId)
        // Reset worker_profile to blank slate so new registration fills it in
        val displayName = nameOrPhone?.trim() ?: ""
        db.updateRaw(
            """INSERT INTO app.worker_profiles (user_id, full_name)
               VALUES (?, ?)
               ON CONFLICT (user_id) DO UPDATE SET
                 full_name = EXCLUDED.full_name,
                 date_of_birth = NULL, gender = NULL, bio = NULL,
                 experience_months = 0, primary_trade_id = NULL,
                 id_number = NULL, id_verified = false, id_verified_at = NULL,
                 profile_complete = false, terms_accepted = false, privacy_accepted = false,
                 updated_at = NOW()""",
            userId, displayName
        )
    }

    fun updateProfile(userId: String, name: String?, email: String?): Map<String, Any?>? {
        if (email != null) {
            db.updateRaw(
                "UPDATE auth.users SET email = ?, updated_at = NOW() WHERE id = ?",
                email, userId
            )
        }
        if (name != null) {
            db.updateRaw(
                """INSERT INTO app.worker_profiles (user_id, full_name, date_of_birth, experience_months)
                   VALUES (?, ?, '1990-01-01', 0)
                   ON CONFLICT (user_id) DO UPDATE SET full_name = ?, updated_at = NOW()""",
                userId, name, name  // third ? is the CONFLICT UPDATE full_name = ?
            )
        }
        return getMeProfile(userId)
    }
}
