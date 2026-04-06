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

        data["fullName"]?.let             { setClauses.add("full_name = ?");               params.add(it) }
        data["dateOfBirth"]?.let          { setClauses.add("date_of_birth = ?");         params.add(it) }
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

        db.updateRaw(
            "UPDATE app.worker_profiles SET ${setClauses.joinToString(", ")} WHERE user_id = ?",
            *params.toTypedArray()
        )
        return findByUserId(userId)
    }
}
