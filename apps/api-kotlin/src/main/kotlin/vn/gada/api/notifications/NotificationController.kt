package vn.gada.api.notifications

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.security.AuthUser

@RestController
@RequestMapping("/notifications")
class NotificationController(private val notificationService: NotificationService) {

    /** GET /notifications */
    @GetMapping
    fun getNotifications(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestParam(required = false, defaultValue = "1") page: Int,
        @RequestParam(required = false, defaultValue = "20") limit: Int,
        @RequestParam(required = false) unreadOnly: String?
    ): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        val result = notificationService.findByUser(
            userId = user.id,
            page = page,
            limit = limit,
            unreadOnly = unreadOnly == "true"
        )
        return ok(result)
    }

    /** PUT /notifications/read-all — must come before /:id/read */
    @PutMapping("/read-all")
    fun markAllAsRead(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        return ok(notificationService.markAllRead(user.id))
    }

    /** PUT /notifications/:id/read */
    @PutMapping("/{id}/read")
    fun markAsRead(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        return ok(notificationService.markRead(id, user.id))
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
