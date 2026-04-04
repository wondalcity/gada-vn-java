package vn.gada.api.admin

import jakarta.servlet.http.HttpServletRequest
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import vn.gada.api.common.exception.UnauthorizedException

@RestController
@RequestMapping("/admin")
class AdminController(
    private val adminService: AdminService,
    @Value("\${gada.admin.service-key}") private val serviceKey: String
) {

    private fun checkAdminKey(request: HttpServletRequest) {
        val key = request.getHeader("x-admin-key")
        if (key != serviceKey) throw UnauthorizedException("Invalid or missing admin service key")
    }

    // ── Manager approval ─────────────────────────────────────────────────────

    /** GET /admin/managers */
    @GetMapping("/managers")
    fun listManagers(
        request: HttpServletRequest,
        @RequestParam(defaultValue = "PENDING") status: String,
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "20") limit: Int
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.listManagers(status, page, limit))
    }

    /** GET /admin/managers/:id */
    @GetMapping("/managers/{id}")
    fun getManager(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.getManager(id))
    }

    /** POST /admin/managers/:id/approve */
    @PostMapping("/managers/{id}/approve")
    fun approveManager(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.approveManager(id))
    }

    /** POST /admin/managers/:id/reject */
    @PostMapping("/managers/{id}/reject")
    fun rejectManager(
        request: HttpServletRequest,
        @PathVariable id: String,
        @RequestBody(required = false) body: Map<String, Any?>?
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        val reason = body?.get("reason") as? String ?: ""
        return ok(adminService.rejectManager(id, reason))
    }

    /** POST /admin/managers/:id/revoke */
    @PostMapping("/managers/{id}/revoke")
    fun revokeManager(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.revokeManager(id))
    }

    /** PUT /admin/managers/:id */
    @PutMapping("/managers/{id}")
    fun updateManager(
        request: HttpServletRequest,
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.updateManager(id, body))
    }

    /** POST /admin/managers/promote-worker */
    @PostMapping("/managers/promote-worker")
    fun promoteWorkerToManager(
        request: HttpServletRequest,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        val workerId = body["workerId"] as? String ?: throw vn.gada.api.common.exception.BadRequestException("workerId is required")
        val companyName = body["companyName"] as? String ?: ""
        val phone = body["phone"] as? String ?: ""
        return ok(adminService.promoteWorkerToManager(workerId, companyName, phone))
    }

    /** GET /admin/managers/:id/sites */
    @GetMapping("/managers/{id}/sites")
    fun getManagerSites(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.getManagerSites(id))
    }

    /** POST /admin/managers/:id/sites/:siteId */
    @PostMapping("/managers/{id}/sites/{siteId}")
    fun assignSiteToManager(
        request: HttpServletRequest,
        @PathVariable id: String,
        @PathVariable siteId: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.assignSiteToManager(id, siteId))
    }

    /** DELETE /admin/managers/:id/sites/:siteId */
    @DeleteMapping("/managers/{id}/sites/{siteId}")
    fun unassignSiteFromManager(
        request: HttpServletRequest,
        @PathVariable id: String,
        @PathVariable siteId: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.unassignSiteFromManager(id, siteId))
    }

    // ── Workers ───────────────────────────────────────────────────────────────

    /** GET /admin/workers — returns { data, total } */
    @GetMapping("/workers")
    fun listWorkers(
        request: HttpServletRequest,
        @RequestParam(defaultValue = "") search: String,
        @RequestParam(defaultValue = "20") limit: Int
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.searchWorkers(search, limit))
    }

    /** GET /admin/workers/:id */
    @GetMapping("/workers/{id}")
    fun getWorker(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.getWorker(id))
    }

    /** POST /admin/workers */
    @PostMapping("/workers")
    fun createWorker(
        request: HttpServletRequest,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        val phone = body["phone"] as? String ?: ""
        val fullName = body["fullName"] as? String ?: body["full_name"] as? String ?: ""
        return ok(adminService.createWorker(phone, fullName))
    }

    /** PUT /admin/workers/:id */
    @PutMapping("/workers/{id}")
    fun updateWorker(
        request: HttpServletRequest,
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.updateWorker(id, body))
    }

    /** DELETE /admin/workers/:id */
    @DeleteMapping("/workers/{id}")
    fun deleteWorker(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.deleteWorker(id))
    }

    /** GET /admin/workers/:id/trade-skills */
    @GetMapping("/workers/{id}/trade-skills")
    fun getWorkerTradeSkills(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.getWorkerTradeSkills(id))
    }

    /** PUT /admin/workers/:id/trade-skills */
    @PutMapping("/workers/{id}/trade-skills")
    fun updateWorkerTradeSkills(
        request: HttpServletRequest,
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.updateWorkerTradeSkills(id, body))
    }

    // ── Jobs ──────────────────────────────────────────────────────────────────

    /** GET /admin/jobs */
    @GetMapping("/jobs")
    fun listJobs(
        request: HttpServletRequest,
        @RequestParam(required = false) status: String?,
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "20") limit: Int
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.listJobs(status, page, limit))
    }

    /** GET /admin/jobs/:id/roster — returns { job, roster } */
    @GetMapping("/jobs/{id}/roster")
    fun getJobRoster(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.getJobWithRoster(id))
    }

    /** POST /admin/jobs */
    @PostMapping("/jobs")
    fun createJob(
        request: HttpServletRequest,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.createJob(body))
    }

    /** PUT /admin/jobs/:id */
    @PutMapping("/jobs/{id}")
    fun updateJob(
        request: HttpServletRequest,
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.updateJob(id, body))
    }

    /** DELETE /admin/jobs/:id */
    @DeleteMapping("/jobs/{id}")
    fun deleteJob(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.deleteJob(id))
    }

    /** PUT /admin/applications/:id/accept */
    @PutMapping("/applications/{id}/accept")
    fun acceptApplication(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.acceptApplication(id))
    }

    /** PUT /admin/applications/:id/reject */
    @PutMapping("/applications/{id}/reject")
    fun rejectApplication(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.rejectApplication(id))
    }

    /** PUT /admin/applications/:id/reset */
    @PutMapping("/applications/{id}/reset")
    fun resetApplication(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.resetApplication(id))
    }

    // ── Sites ─────────────────────────────────────────────────────────────────

    /** GET /admin/sites */
    @GetMapping("/sites")
    fun listSites(request: HttpServletRequest): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.listSites())
    }

    /** GET /admin/sites/:id */
    @GetMapping("/sites/{id}")
    fun getSite(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.getSite(id))
    }

    /** POST /admin/sites */
    @PostMapping("/sites")
    fun createSite(
        request: HttpServletRequest,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.createSite(body))
    }

    /** PUT /admin/sites/:id */
    @PutMapping("/sites/{id}")
    fun updateSite(
        request: HttpServletRequest,
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.updateSite(id, body))
    }

    /** DELETE /admin/sites/:id */
    @DeleteMapping("/sites/{id}")
    fun deleteSite(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.deleteSite(id))
    }

    // ── Companies ─────────────────────────────────────────────────────────────

    /** GET /admin/companies */
    @GetMapping("/companies")
    fun listCompanies(request: HttpServletRequest): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.listCompanies())
    }

    /** GET /admin/companies/:id */
    @GetMapping("/companies/{id}")
    fun getCompany(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.getCompany(id))
    }

    /** POST /admin/companies */
    @PostMapping("/companies")
    fun createCompany(
        request: HttpServletRequest,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.createCompany(body))
    }

    /** PUT /admin/companies/:id */
    @PutMapping("/companies/{id}")
    fun updateCompany(
        request: HttpServletRequest,
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.updateCompany(id, body))
    }

    /** DELETE /admin/companies/:id */
    @DeleteMapping("/companies/{id}")
    fun deleteCompany(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.deleteCompany(id))
    }

    // ── Trades ────────────────────────────────────────────────────────────────

    /** GET /admin/trades */
    @GetMapping("/trades")
    fun listTrades(request: HttpServletRequest): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.listTrades())
    }

    // ── Notification management ───────────────────────────────────────────────

    /** GET /admin/notification-users */
    @GetMapping("/notification-users")
    fun searchNotificationUsers(
        request: HttpServletRequest,
        @RequestParam(defaultValue = "") search: String,
        @RequestParam(defaultValue = "") role: String,
        @RequestParam(defaultValue = "30") limit: Int
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        val result = if (search.isEmpty() && role.isNotBlank()) {
            adminService.getUsersByRole(role)
        } else {
            adminService.searchUsers(search, role, limit)
        }
        return ok(result)
    }

    /** POST /admin/notifications/send */
    @PostMapping("/notifications/send")
    fun sendNotification(
        request: HttpServletRequest,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        @Suppress("UNCHECKED_CAST")
        val userIds = body["userIds"] as? List<String> ?: emptyList()
        val title = body["title"] as? String ?: ""
        val msgBody = body["body"] as? String ?: ""
        @Suppress("UNCHECKED_CAST")
        val channels = body["channels"] as? List<String> ?: listOf("push")
        val type = body["type"] as? String ?: "ADMIN"
        return ok(adminService.sendBulkNotification(userIds, title, msgBody, channels, type))
    }

    /** GET /admin/notifications/schedules */
    @GetMapping("/notifications/schedules")
    fun getPushSchedules(request: HttpServletRequest): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.getPushSchedules())
    }

    /** POST /admin/notifications/schedule */
    @PostMapping("/notifications/schedule")
    fun scheduleNotification(
        request: HttpServletRequest,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.createPushSchedule(body))
    }

    /** DELETE /admin/notifications/schedules/:id */
    @DeleteMapping("/notifications/schedules/{id}")
    fun cancelSchedule(
        request: HttpServletRequest,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        checkAdminKey(request)
        return ok(adminService.cancelPushSchedule(id))
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
