package vn.gada.api.managers

import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService

@Repository
class ManagerRepository(private val db: DatabaseService) {

    fun findByUserId(userId: String): Map<String, Any?>? {
        val rows = db.queryForList(
            "SELECT * FROM app.manager_profiles WHERE user_id = ?",
            userId
        )
        return rows.firstOrNull()
    }

    fun findRegistrationStatus(userId: String): Map<String, Any?> {
        val rows = db.queryForList(
            """SELECT
                 id, approval_status, rejection_reason, created_at as applied_at
               FROM app.manager_profiles
               WHERE user_id = ?""",
            userId
        )
        val r = rows.firstOrNull() ?: return mapOf(
            "hasApplied" to false,
            "approvalStatus" to null,
            "rejectionReason" to null,
            "appliedAt" to null
        )
        return mapOf(
            "hasApplied" to true,
            "approvalStatus" to r["approval_status"],
            "rejectionReason" to r["rejection_reason"],
            "appliedAt" to r["applied_at"]
        )
    }

    fun upsert(userId: String, data: Map<String, Any?>): Map<String, Any?>? {
        val companyName = (data["companyNameKo"] ?: data["companyName"]) as? String
        val businessType = (data["businessType"] as? String) ?: "CORPORATE"
        val representativeName = data["representativeName"] as? String
        val contactPhone = data["contactPhone"] as? String

        val rows = db.queryForListRaw(
            """INSERT INTO app.manager_profiles
                 (user_id, business_type, company_name, representative_name,
                  contact_phone, approval_status)
               VALUES (?, ?, ?, ?, ?, 'PENDING')
               ON CONFLICT (user_id) DO UPDATE SET
                 business_type = EXCLUDED.business_type,
                 company_name = EXCLUDED.company_name,
                 representative_name = COALESCE(EXCLUDED.representative_name, app.manager_profiles.representative_name),
                 contact_phone = COALESCE(EXCLUDED.contact_phone, app.manager_profiles.contact_phone),
                 approval_status = 'PENDING',
                 rejection_reason = NULL,
                 updated_at = NOW()
               RETURNING *""",
            userId, businessType, companyName, representativeName, contactPhone
        )
        return rows.firstOrNull()
    }

    fun updateByUserId(userId: String, data: Map<String, Any?>): Map<String, Any?>? {
        val contactPhone = data["contactPhone"] as? String
        val rows = db.queryForListRaw(
            """UPDATE app.manager_profiles
               SET contact_phone = COALESCE(?, contact_phone), updated_at = NOW()
               WHERE user_id = ? RETURNING *""",
            contactPhone, userId
        )
        return rows.firstOrNull()
    }
}
