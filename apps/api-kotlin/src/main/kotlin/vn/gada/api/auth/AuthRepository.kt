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
        val firebaseUid = r["firebase_uid"]?.toString() ?: ""
        return mapOf(
            "id" to r["id"],
            "firebaseUid" to firebaseUid,
            "name" to (r["worker_name"] ?: r["phone"] ?: r["email"] ?: "User"),
            "phone" to r["phone"],
            "email" to r["email"],
            "locale" to "ko",
            "status" to r["status"],
            "isWorker" to (r["role"] == "WORKER"),
            "isManager" to (r["role"] == "MANAGER"),
            "isAdmin" to (r["role"] == "ADMIN"),
            "isTestAccount" to firebaseUid.startsWith("test-uid-"),
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

    fun isTestAccount(phone: String): Boolean {
        val rows = db.queryForList(
            "SELECT is_test_account FROM auth.users WHERE phone = ?",
            phone
        )
        return rows.firstOrNull()?.get("is_test_account") == true
    }

    fun createTestAccount(phone: String, role: String, name: String): Map<String, Any?> {
        val normalizedRole = role.uppercase()
        val firebaseUid = "test-uid-phone-${phone.replace("+", "").replace(" ", "")}"
        // Clear phone conflict
        db.updateRaw(
            "UPDATE auth.users SET phone = NULL WHERE phone = ? AND firebase_uid != ?",
            phone, firebaseUid
        )
        val rows = db.queryForListRaw(
            """INSERT INTO auth.users (firebase_uid, phone, role, status, is_test_account)
               VALUES (?, ?, ?, 'ACTIVE', TRUE)
               ON CONFLICT (firebase_uid) DO UPDATE
                 SET phone = EXCLUDED.phone, role = EXCLUDED.role,
                     status = 'ACTIVE', is_test_account = TRUE
               RETURNING *""",
            firebaseUid, phone, normalizedRole
        )
        val user = rows.first()
        val userId = user["id"] as String
        db.updateRaw(
            """INSERT INTO app.worker_profiles (user_id, full_name)
               VALUES (?, ?)
               ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name""",
            userId, name
        )
        if (normalizedRole == "MANAGER") {
            db.updateRaw(
                """INSERT INTO app.manager_profiles
                     (user_id, business_type, representative_name, approval_status)
                   VALUES (?, 'INDIVIDUAL', ?, 'APPROVED')
                   ON CONFLICT (user_id) DO UPDATE SET approval_status = 'APPROVED'""",
                userId, name
            )
        }
        return user
    }

    fun listTestAccounts(): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT u.id, u.phone, u.role, u.status, u.created_at,
                      wp.full_name
               FROM auth.users u
               LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
               WHERE u.is_test_account = TRUE
               ORDER BY u.created_at DESC"""
        )
    }

    fun deleteTestAccount(id: String): Int {
        return db.update(
            "DELETE FROM auth.users WHERE id = ? AND is_test_account = TRUE",
            id
        )
    }

    fun upsertTestAccount(role: String): Map<String, Any?> {
        val firebaseUid = "test-uid-${role.lowercase()}"
        val phone = if (role == "WORKER") "+84000000001" else "+84000000002"
        val name = if (role == "WORKER") "테스트 근로자" else "테스트 관리자"
        db.updateRaw(
            "UPDATE auth.users SET phone = NULL WHERE phone = ? AND firebase_uid != ?",
            phone, firebaseUid
        )
        val rows = db.queryForListRaw(
            """INSERT INTO auth.users (firebase_uid, phone, role, status, is_test_account)
               VALUES (?, ?, ?, 'ACTIVE', TRUE)
               ON CONFLICT (firebase_uid) DO UPDATE SET status = 'ACTIVE', phone = EXCLUDED.phone, role = EXCLUDED.role, is_test_account = TRUE
               RETURNING *""",
            firebaseUid, phone, role
        )
        val user = rows.first()
        val userId = user["id"] as String
        db.updateRaw(
            """INSERT INTO app.worker_profiles (user_id, full_name)
               VALUES (?, ?)
               ON CONFLICT (user_id) DO NOTHING""",
            userId, name
        )
        if (role == "MANAGER") {
            db.updateRaw(
                """INSERT INTO app.manager_profiles
                     (user_id, business_type, company_name, representative_name, approval_status)
                   VALUES (?, 'CORPORATE', '테스트 건설', ?, 'APPROVED')
                   ON CONFLICT (user_id) DO UPDATE SET approval_status = 'APPROVED'""",
                userId, name
            )
        }
        return user
    }

    fun updatePhone(userId: String, phone: String) {
        db.updateRaw(
            "UPDATE auth.users SET phone = ?, updated_at = NOW() WHERE id = ?",
            phone, userId
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
                """INSERT INTO app.worker_profiles (user_id, full_name)
                   VALUES (?, ?)
                   ON CONFLICT (user_id) DO UPDATE SET full_name = ?, updated_at = NOW()""",
                userId, name, name
            )
        }
        return getMeProfile(userId)
    }
}
