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
