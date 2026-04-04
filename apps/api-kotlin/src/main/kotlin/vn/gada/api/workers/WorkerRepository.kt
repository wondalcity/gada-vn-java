package vn.gada.api.workers

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService

@Repository
class WorkerRepository(
    private val db: DatabaseService,
    @Value("\${gada.aws.cdn-domain:}") private val cdnDomain: String
) {

    private fun toUrl(key: String?): String? {
        if (key.isNullOrBlank()) return null
        if (key.startsWith("http://") || key.startsWith("https://")) return key
        if (cdnDomain.isBlank()) return null
        val base = if (cdnDomain.startsWith("http")) cdnDomain else "https://$cdnDomain"
        return "$base/$key"
    }

    fun findByUserId(userId: String): Map<String, Any?>? {
        val rows = db.queryForList(
            """SELECT wp.id, wp.user_id AS "userId",
                      wp.full_name AS "fullName",
                      wp.date_of_birth AS "dateOfBirth",
                      wp.gender,
                      wp.bio,
                      wp.experience_months AS "experienceMonths",
                      wp.primary_trade_id AS "primaryTradeId",
                      wp.current_province AS "province",
                      wp.current_district AS "district",
                      wp.lat, wp.lng,
                      wp.id_number AS "idNumber",
                      wp.id_verified AS "idVerified",
                      wp.id_verified_at AS "idVerifiedAt",
                      wp.bank_name AS "bankName",
                      wp.bank_account_number AS "bankAccountNumber",
                      wp.profile_picture_s3_key AS "profilePictureS3Key",
                      wp.signature_s3_key AS "signatureS3Key",
                      wp.profile_complete AS "profileComplete",
                      wp.terms_accepted AS "termsAccepted",
                      wp.privacy_accepted AS "privacyAccepted",
                      wp.created_at AS "createdAt",
                      u.phone, u.email
               FROM app.worker_profiles wp
               JOIN auth.users u ON wp.user_id = u.id
               WHERE wp.user_id = ?""",
            userId
        )
        val row = rows.firstOrNull() ?: return null
        return row + mapOf(
            "profilePictureUrl" to toUrl(row["profilePictureS3Key"] as? String),
            "signatureUrl" to toUrl(row["signatureS3Key"] as? String),
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

    fun updateByUserId(userId: String, data: Map<String, Any?>): Map<String, Any?>? {
        val setClauses = mutableListOf<String>()
        val params = mutableListOf<Any?>()

        data["fullName"]?.let            { setClauses.add("full_name = ?");          params.add(it) }
        data["dateOfBirth"]?.let         { setClauses.add("date_of_birth = ?");      params.add(it) }
        data["gender"]?.let              { setClauses.add("gender = ?");             params.add(it) }
        data["bio"]?.let                 { setClauses.add("bio = ?");                params.add(it) }
        data["experienceMonths"]?.let    { setClauses.add("experience_months = ?");  params.add(it) }
        data["primaryTradeId"]?.let      { setClauses.add("primary_trade_id = ?");   params.add(it) }
        data["province"]?.let            { setClauses.add("current_province = ?");   params.add(it) }
        data["bankName"]?.let            { setClauses.add("bank_name = ?");          params.add(it) }
        data["bankAccountNumber"]?.let   { setClauses.add("bank_account_number = ?");params.add(it) }

        if (setClauses.isEmpty()) return findByUserId(userId)

        setClauses.add("updated_at = NOW()")
        params.add(userId)

        db.updateRaw(
            "UPDATE app.worker_profiles SET ${setClauses.joinToString(", ")} WHERE user_id = ?",
            *params.toTypedArray()
        )
        return findByUserId(userId)
    }
}
