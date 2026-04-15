package vn.gada.api.managers

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import vn.gada.api.applications.ApplicationService
import vn.gada.api.attendance.AttendanceService
import vn.gada.api.common.database.DatabaseService
import vn.gada.api.jobs.JobRepository
import vn.gada.api.common.exception.ForbiddenException
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.security.AuthUser

@RestController
@RequestMapping("/manager")
class ManagerJobController(
    private val db: DatabaseService,
    private val applicationService: ApplicationService,
    private val attendanceService: AttendanceService,
    private val jobRepo: JobRepository,
    @Value("\${gada.aws.cdn-domain:}") private val cdnDomain: String
) {

    private fun toImageUrl(key: String?): String? {
        if (key == null) return null
        if (key.startsWith("http://") || key.startsWith("https://")) return key
        if (cdnDomain.isBlank()) return null
        val base = if (cdnDomain.startsWith("http")) cdnDomain else "https://$cdnDomain"
        return "$base/$key"
    }

    /** GET /manager/jobs */
    @GetMapping("/jobs")
    fun listAllJobs(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val rows = db.queryForList(
            """SELECT
                 j.id, j.slug, j.title, j.work_date, j.daily_wage, j.currency,
                 j.slots_total, j.slots_filled, j.status, j.created_at, j.updated_at,
                 s.id AS site_id, s.name AS site_name,
                 s.image_s3_keys, s.cover_image_idx,
                 COUNT(a.id) FILTER (WHERE a.status = 'PENDING')  AS pending_count,
                 COUNT(a.id) FILTER (WHERE a.status = 'ACCEPTED') AS accepted_count
               FROM app.jobs j
               JOIN app.construction_sites s ON j.site_id = s.id
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               LEFT JOIN app.job_applications a ON a.job_id = j.id AND a.status != 'WITHDRAWN'
               WHERE mp.user_id = ?
               GROUP BY j.id, s.id
               ORDER BY j.created_at DESC""",
            u.id
        )

        @Suppress("UNCHECKED_CAST")
        val result = rows.map { r ->
            val imageKeys = (r["image_s3_keys"] as? List<String>) ?: emptyList()
            val coverIdx = (r["cover_image_idx"] as? Number)?.toInt() ?: 0
            mapOf(
                "id" to r["id"],
                "slug" to r["slug"],
                "siteId" to r["site_id"],
                "siteName" to r["site_name"],
                "title" to r["title"],
                "workDate" to r["work_date"],
                "dailyWage" to (r["daily_wage"] as? Number)?.toDouble(),
                "currency" to (r["currency"] ?: "VND"),
                "slotsTotal" to (r["slots_total"] as? Number)?.toInt(),
                "slotsFilled" to (r["slots_filled"] as? Number)?.toInt(),
                "status" to r["status"],
                "createdAt" to r["created_at"],
                "updatedAt" to r["updated_at"],
                "coverImageUrl" to toImageUrl(imageKeys.getOrNull(coverIdx)),
                "imageUrls" to imageKeys.mapNotNull { toImageUrl(it) },
                "shiftCount" to 0,
                "applicationCount" to mapOf(
                    "pending" to ((r["pending_count"] as? Number)?.toInt() ?: 0),
                    "accepted" to ((r["accepted_count"] as? Number)?.toInt() ?: 0),
                    "rejected" to 0
                )
            )
        }
        return ok(result)
    }

    /** GET /manager/dashboard */
    @GetMapping("/dashboard")
    fun getDashboard(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val rows = db.queryForList(
            """SELECT
                 COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'ACTIVE') AS active_sites,
                 COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'OPEN')   AS open_jobs,
                 COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'PENDING') AS pending_applications
               FROM app.manager_profiles mp
               LEFT JOIN app.construction_sites s ON s.manager_id = mp.id
               LEFT JOIN app.jobs j ON j.manager_id = mp.id
               LEFT JOIN app.job_applications a ON a.job_id = j.id
               WHERE mp.user_id = ?""",
            u.id
        )
        val r = rows.firstOrNull()
        return ok(mapOf(
            "activeSites" to ((r?.get("active_sites") as? Number)?.toInt() ?: 0),
            "openJobs" to ((r?.get("open_jobs") as? Number)?.toInt() ?: 0),
            "pendingApplications" to ((r?.get("pending_applications") as? Number)?.toInt() ?: 0)
        ))
    }

    /** GET /manager/jobs/:id */
    @GetMapping("/jobs/{id}")
    fun getJob(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val rows = db.queryForList(
            """SELECT
                 j.id, j.slug, j.title, j.description, j.trade_id,
                 j.work_date, j.start_time, j.end_time, j.daily_wage, j.currency,
                 j.benefits, j.requirements, j.slots_total, j.slots_filled,
                 j.status, j.published_at, j.expires_at, j.created_at, j.updated_at,
                 s.id AS site_id, s.name AS site_name,
                 s.image_s3_keys, s.cover_image_idx,
                 t.name_ko AS trade_name,
                 COUNT(a.id) FILTER (WHERE a.status = 'PENDING')  AS pending_count,
                 COUNT(a.id) FILTER (WHERE a.status = 'ACCEPTED') AS accepted_count,
                 COUNT(a.id) FILTER (WHERE a.status = 'REJECTED') AS rejected_count
               FROM app.jobs j
               JOIN app.construction_sites s ON j.site_id = s.id
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               LEFT JOIN ref.construction_trades t ON j.trade_id = t.id
               LEFT JOIN app.job_applications a ON a.job_id = j.id AND a.status != 'WITHDRAWN'
               WHERE j.id = ? AND mp.user_id = ?
               GROUP BY j.id, s.id, t.id""",
            id, u.id
        )
        if (rows.isEmpty()) return ok(null)

        @Suppress("UNCHECKED_CAST")
        val r = rows[0]
        val imageKeys = (r["image_s3_keys"] as? List<String>) ?: emptyList()
        val coverIdx = (r["cover_image_idx"] as? Number)?.toInt() ?: 0
        val imageUrls = imageKeys.mapNotNull { toImageUrl(it) }

        @Suppress("UNCHECKED_CAST")
        val benefits = (r["benefits"] as? Map<String, Boolean>) ?: emptyMap()

        @Suppress("UNCHECKED_CAST")
        val reqRaw = r["requirements"] as? Map<String, Any?>

        return ok(mapOf(
            "id" to r["id"],
            "slug" to r["slug"],
            "siteId" to r["site_id"],
            "siteName" to r["site_name"],
            "title" to r["title"],
            "description" to r["description"],
            "tradeId" to r["trade_id"],
            "tradeName" to r["trade_name"],
            "workDate" to r["work_date"],
            "startTime" to r["start_time"],
            "endTime" to r["end_time"],
            "dailyWage" to (r["daily_wage"] as? Number)?.toDouble(),
            "currency" to (r["currency"] ?: "VND"),
            "benefits" to mapOf(
                "meals" to (benefits["meals"] ?: false),
                "transport" to (benefits["transport"] ?: false),
                "accommodation" to (benefits["accommodation"] ?: false),
                "insurance" to (benefits["insurance"] ?: false)
            ),
            "requirements" to reqRaw?.let { req ->
                mapOf(
                    "minExperienceMonths" to (req["minExperienceMonths"] ?: req["experience_months"]),
                    "notes" to req["notes"]
                )
            },
            "slotsTotal" to (r["slots_total"] as? Number)?.toInt(),
            "slotsFilled" to (r["slots_filled"] as? Number)?.toInt(),
            "status" to r["status"],
            "publishedAt" to r["published_at"],
            "expiresAt" to r["expires_at"],
            "createdAt" to r["created_at"],
            "updatedAt" to r["updated_at"],
            "coverImageUrl" to toImageUrl(imageKeys.getOrNull(coverIdx)),
            "imageUrls" to imageUrls,
            "shiftCount" to 0,
            "applicationCount" to mapOf(
                "pending" to ((r["pending_count"] as? Number)?.toInt() ?: 0),
                "accepted" to ((r["accepted_count"] as? Number)?.toInt() ?: 0),
                "rejected" to ((r["rejected_count"] as? Number)?.toInt() ?: 0)
            )
        ))
    }

    /** PUT /manager/jobs/:id — Edit job fields */
    @PutMapping("/jobs/{id}")
    fun updateJob(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val managerId = jobRepo.getManagerIdByUserId(u.id)
        return ok(jobRepo.update(id, managerId, body))
    }

    /** PATCH /manager/jobs/:id/status */
    @PatchMapping("/jobs/{id}/status")
    fun updateJobStatus(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val rows = db.queryForList(
            """UPDATE app.jobs j SET status = ?, updated_at = NOW()
               FROM app.manager_profiles mp
               WHERE j.id = ? AND j.manager_id = mp.id AND mp.user_id = ?
               RETURNING j.id, j.status, j.slots_total, j.slots_filled""",
            body["status"] as String, id, u.id
        )
        if (rows.isEmpty()) return ok(null)
        val r = rows[0]
        return ok(mapOf(
            "id" to r["id"],
            "status" to r["status"],
            "slotsTotal" to (r["slots_total"] as? Number)?.toInt(),
            "slotsFilled" to (r["slots_filled"] as? Number)?.toInt(),
            "jobStatus" to r["status"]
        ))
    }

    /** GET /manager/jobs/:id/applications */
    @GetMapping("/jobs/{id}/applications")
    fun getJobApplications(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val jobRows = db.queryForList(
            """SELECT j.id, j.title, j.slots_total, j.slots_filled, j.status
               FROM app.jobs j
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               WHERE j.id = ? AND mp.user_id = ?""",
            id, u.id
        )
        if (jobRows.isEmpty()) {
            return ok(mapOf(
                "applicants" to emptyList<Any>(),
                "meta" to mapOf("slotsTotal" to 0, "slotsFilled" to 0, "jobStatus" to "OPEN", "jobTitle" to "")
            ))
        }
        val job = jobRows[0]

        val rows = db.queryForList(
            """SELECT a.id, a.status, a.applied_at, a.notes,
                      wp.id AS worker_id, wp.full_name AS worker_name,
                      wp.experience_months, wp.id_verified,
                      wp.signature_s3_key IS NOT NULL AS has_signature,
                      u.phone AS worker_phone,
                      t.name_ko AS trade_name_ko, t.id AS trade_id
               FROM app.job_applications a
               JOIN app.worker_profiles wp ON a.worker_id = wp.id
               JOIN auth.users u ON wp.user_id = u.id
               LEFT JOIN ref.construction_trades t ON t.id = wp.primary_trade_id
               WHERE a.job_id = ?
                 AND a.status != 'WITHDRAWN'
               ORDER BY a.applied_at ASC""",
            id
        )

        val applicants = rows.map { r ->
            mapOf(
                "id" to r["id"],
                "status" to r["status"],
                "appliedAt" to r["applied_at"],
                "notes" to r["notes"],
                "worker" to mapOf(
                    "id" to r["worker_id"],
                    "name" to (r["worker_name"] ?: ""),
                    "phone" to r["worker_phone"],
                    "experienceMonths" to ((r["experience_months"] as? Number)?.toInt() ?: 0),
                    "primaryTradeId" to r["trade_id"],
                    "tradeNameKo" to r["trade_name_ko"],
                    "idVerified" to (r["id_verified"] ?: false),
                    "hasSignature" to (r["has_signature"] == true)
                )
            )
        }

        return ok(mapOf(
            "applicants" to applicants,
            "meta" to mapOf(
                "jobTitle" to (job["title"] ?: ""),
                "slotsTotal" to ((job["slots_total"] as? Number)?.toInt() ?: 0),
                "slotsFilled" to ((job["slots_filled"] as? Number)?.toInt() ?: 0),
                "jobStatus" to (job["status"] ?: "OPEN")
            )
        ))
    }

    /** GET /manager/applications — All applications across all manager's jobs */
    @GetMapping("/applications")
    fun listAllApplications(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val rows = db.queryForList(
            """SELECT a.id, a.status, a.applied_at,
                      j.id AS job_id, j.title AS job_title, j.work_date,
                      wp.id AS worker_id, wp.full_name AS worker_name,
                      u.phone AS worker_phone,
                      t.name_ko AS trade_name
               FROM app.job_applications a
               JOIN app.jobs j ON a.job_id = j.id
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               JOIN app.worker_profiles wp ON a.worker_id = wp.id
               JOIN auth.users u ON wp.user_id = u.id
               LEFT JOIN ref.construction_trades t ON t.id = wp.primary_trade_id
               WHERE mp.user_id = ? AND a.status != 'WITHDRAWN'
               ORDER BY a.applied_at DESC""",
            u.id
        )
        val result = rows.map { r ->
            mapOf(
                "id" to r["id"],
                "status" to r["status"],
                "appliedAt" to r["applied_at"],
                "jobId" to r["job_id"],
                "jobTitle" to r["job_title"],
                "workDate" to r["work_date"],
                "workerId" to r["worker_id"],
                "workerName" to (r["worker_name"] ?: ""),
                "workerPhone" to (r["worker_phone"] ?: ""),
                "workerTrades" to if (r["trade_name"] != null) listOf(r["trade_name"]) else emptyList<String>()
            )
        }
        return ok(result)
    }

    /** PATCH /manager/applications/:id/accept */
    @PatchMapping("/applications/{id}/accept")
    fun acceptApplication(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val updated = applicationService.hire(id, u.id) ?: return ok(null)
        // Increment slots_filled when a worker is accepted
        val rows = db.queryForList(
            """UPDATE app.jobs j SET slots_filled = slots_filled + 1
               FROM app.job_applications a
               WHERE a.id = ? AND j.id = a.job_id
               RETURNING j.slots_total, j.slots_filled, j.status""",
            id
        )
        val r = rows.firstOrNull()
        return ok(updated + mapOf(
            "slotsTotal" to ((r?.get("slots_total") as? Number)?.toInt()),
            "slotsFilled" to ((r?.get("slots_filled") as? Number)?.toInt()),
            "jobStatus" to r?.get("status")
        ))
    }

    /** PATCH /manager/applications/:id/reject */
    @PatchMapping("/applications/{id}/reject")
    fun rejectApplication(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody(required = false) body: Map<String, Any?>?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val updated = applicationService.reject(id, u.id) ?: return ok(null)
        val rows = db.queryForList(
            """SELECT j.slots_total, j.slots_filled, j.status
               FROM app.job_applications a
               JOIN app.jobs j ON a.job_id = j.id
               WHERE a.id = ?""",
            id
        )
        val r = rows.firstOrNull()
        return ok(updated + mapOf(
            "slotsTotal" to ((r?.get("slots_total") as? Number)?.toInt()),
            "slotsFilled" to ((r?.get("slots_filled") as? Number)?.toInt()),
            "jobStatus" to r?.get("status")
        ))
    }

    /** PATCH /manager/hires/:id/cancel */
    @PatchMapping("/hires/{id}/cancel")
    fun cancelHire(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val appRows = db.queryForList(
            """SELECT a.id FROM app.job_applications a
               JOIN app.jobs j ON a.job_id = j.id
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               WHERE a.id = ? AND mp.user_id = ? AND a.status = 'ACCEPTED'""",
            id, u.id
        )
        if (appRows.isEmpty()) return ok(null)

        db.updateRaw(
            "UPDATE app.job_applications SET status = 'REJECTED', reviewed_at = NOW() WHERE id = ?",
            id
        )
        val rows = db.queryForList(
            """UPDATE app.jobs j SET slots_filled = GREATEST(slots_filled - 1, 0)
               FROM app.job_applications a
               WHERE a.id = ? AND j.id = a.job_id
               RETURNING j.slots_total, j.slots_filled, j.status""",
            id
        )
        val r = rows.firstOrNull()
        return ok(mapOf(
            "success" to true,
            "slotsFilled" to ((r?.get("slots_filled") as? Number)?.toInt()),
            "jobStatus" to r?.get("status")
        ))
    }

    /** GET /manager/jobs/:id/attendance */
    @GetMapping("/jobs/{id}/attendance")
    fun getAttendanceRoster(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?,
        @RequestParam(required = false) date: String?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val jobRows = db.queryForList(
            """SELECT j.id, j.title FROM app.jobs j
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               WHERE j.id = ? AND mp.user_id = ?""",
            id, u.id
        )
        if (jobRows.isEmpty()) return ok(mapOf("roster" to emptyList<Any>(), "jobTitle" to ""))

        val workDate = date ?: java.time.LocalDate.now().toString()

        val rows = db.queryForList(
            """SELECT
                 wp.id AS worker_id,
                 wp.full_name AS worker_name,
                 u.phone AS worker_phone,
                 wp.experience_months,
                 t.name_ko AS trade_name_ko,
                 ar.id AS attendance_id,
                 ar.status AS attendance_status,
                 ar.check_in_time,
                 ar.check_out_time,
                 ar.hours_worked,
                 ar.notes AS attendance_notes
               FROM app.job_applications a
               JOIN app.worker_profiles wp ON a.worker_id = wp.id
               JOIN auth.users u ON wp.user_id = u.id
               LEFT JOIN ref.construction_trades t ON t.id = wp.primary_trade_id
               LEFT JOIN app.attendance_records ar
                 ON ar.job_id = a.job_id AND ar.worker_id = a.worker_id AND ar.work_date = ?
               WHERE a.job_id = ? AND a.status IN ('ACCEPTED', 'CONTRACTED')
               ORDER BY wp.full_name ASC""",
            workDate, id
        )

        val roster = rows.map { r ->
            mapOf(
                "workerId" to r["worker_id"],
                "workerName" to (r["worker_name"] ?: ""),
                "workerPhone" to r["worker_phone"],
                "experienceMonths" to ((r["experience_months"] as? Number)?.toInt() ?: 0),
                "tradeNameKo" to r["trade_name_ko"],
                "attendance" to if (r["attendance_id"] != null) mapOf(
                    "id" to r["attendance_id"],
                    "status" to r["attendance_status"],
                    "checkInTime" to (r["check_in_time"] ?: ""),
                    "checkOutTime" to (r["check_out_time"] ?: ""),
                    "hoursWorked" to (r["hours_worked"] as? Number)?.toDouble(),
                    "notes" to (r["attendance_notes"] ?: "")
                ) else null
            )
        }

        return ok(mapOf("roster" to roster, "jobTitle" to jobRows[0]["title"]))
    }

    /** PUT /manager/jobs/:id/attendance */
    @PutMapping("/jobs/{id}/attendance")
    fun bulkUpsertAttendance(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val jobRows = db.queryForList(
            """SELECT mp.id AS manager_id FROM app.jobs j
               JOIN app.manager_profiles mp ON j.manager_id = mp.id
               WHERE j.id = ? AND mp.user_id = ?""",
            id, u.id
        )
        if (jobRows.isEmpty()) return ok(null)
        val managerId = jobRows[0]["manager_id"] as String

        val workDate = body["work_date"] as String
        @Suppress("UNCHECKED_CAST")
        val records = body["records"] as? List<Map<String, Any?>> ?: emptyList()

        db.transaction {
            for (rec in records) {
                updateRaw(
                    """INSERT INTO app.attendance_records
                         (job_id, worker_id, work_date, status, check_in_time, check_out_time, hours_worked, notes, marked_by, marked_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                       ON CONFLICT (job_id, worker_id, work_date) DO UPDATE SET
                         status         = EXCLUDED.status,
                         check_in_time  = COALESCE(EXCLUDED.check_in_time, app.attendance_records.check_in_time),
                         check_out_time = COALESCE(EXCLUDED.check_out_time, app.attendance_records.check_out_time),
                         hours_worked   = COALESCE(EXCLUDED.hours_worked, app.attendance_records.hours_worked),
                         notes          = COALESCE(EXCLUDED.notes, app.attendance_records.notes),
                         marked_by      = EXCLUDED.marked_by,
                         marked_at      = NOW()""",
                    id, rec["worker_id"], workDate, rec["status"],
                    rec["check_in_time"], rec["check_out_time"],
                    rec["hours_worked"], rec["notes"], managerId
                )
            }
        }

        return ok(mapOf("success" to true))
    }

    private fun requireManager(user: AuthUser?): AuthUser {
        if (user == null) throw UnauthorizedException("Unauthorized")
        if (user.role != "MANAGER" && user.role != "ADMIN") throw ForbiddenException("MANAGER role required")
        return user
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
