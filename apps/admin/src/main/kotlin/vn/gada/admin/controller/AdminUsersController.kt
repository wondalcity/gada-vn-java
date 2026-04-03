package vn.gada.admin.controller

import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Handles admin-user self-service endpoints that must be resolved by the
 * Spring Boot admin app itself (using the live Spring Security session)
 * rather than proxied to the Kotlin API.
 *
 * Routes defined here take priority over ProxyController because Spring MVC
 * picks the most-specific @RequestMapping first.
 */
@RestController
@RequestMapping("/api/admin/admin-users")
class AdminUsersController(private val jdbc: JdbcTemplate) {

    /** GET /api/admin/admin-users/me — returns the currently logged-in admin user. */
    @GetMapping("/me")
    fun me(@AuthenticationPrincipal principal: UserDetails): ResponseEntity<Map<String, Any?>> {
        val row = jdbc.queryForList(
            """SELECT id, email, name, role, status, created_at
               FROM ops.admin_users
               WHERE email = ? AND status = 'ACTIVE'""",
            principal.username,
        ).firstOrNull()
            ?: return ResponseEntity.status(404)
                .body(mapOf("statusCode" to 404, "message" to "Admin user not found"))

        val role = row["role"]?.toString() ?: "VIEWER"
        val permissions = permissionsForRole(role)

        return ResponseEntity.ok(
            mapOf(
                "statusCode" to 200,
                "data" to mapOf(
                    "id"          to row["id"],
                    "email"       to row["email"],
                    "name"        to row["name"],
                    "role"        to role,
                    "status"      to row["status"],
                    "createdAt"   to row["created_at"]?.toString(),
                    "permissions" to permissions,
                ),
            )
        )
    }

    private fun permissionsForRole(role: String): Map<String, Boolean> = when (role) {
        "SUPER_ADMIN" -> mapOf(
            "dashboard"     to true,
            "managers"      to true,
            "workers"       to true,
            "jobs"          to true,
            "sites"         to true,
            "notifications" to true,
            "admin_users"   to true,
        )
        "ADMIN" -> mapOf(
            "dashboard"     to true,
            "managers"      to true,
            "workers"       to true,
            "jobs"          to true,
            "sites"         to true,
            "notifications" to true,
            "admin_users"   to false,
        )
        else -> mapOf( // VIEWER
            "dashboard"     to true,
            "managers"      to false,
            "workers"       to false,
            "jobs"          to false,
            "sites"         to false,
            "notifications" to false,
            "admin_users"   to false,
        )
    }
}
