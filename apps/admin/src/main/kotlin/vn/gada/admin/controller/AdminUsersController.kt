package vn.gada.admin.controller

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*
import vn.gada.admin.service.EmailService
import java.util.UUID

// Handles all /api/admin/admin-users/* endpoints directly in the admin Spring Boot app.
// DB access via JdbcTemplate + Spring Security session context.
// These take priority over ProxyController because Spring MVC picks the most-specific mapping.
@RestController
@RequestMapping("/api/admin/admin-users")
class AdminUsersController(
    private val jdbc: JdbcTemplate,
    private val passwordEncoder: PasswordEncoder,
    private val objectMapper: ObjectMapper,
    private val emailService: EmailService,
) {

    companion object {
        private const val PROTECTED_EMAIL = "admin@gada.vn"
    }

    // ── /me ──────────────────────────────────────────────────────────────────

    /** GET /api/admin/admin-users/me */
    @GetMapping("/me")
    fun me(@AuthenticationPrincipal principal: UserDetails): ResponseEntity<Map<String, Any?>> {
        val row = jdbc.queryForList(
            """SELECT id, email, name, role, permissions, status, created_at
               FROM ops.admin_users
               WHERE email = ? AND status = 'ACTIVE'""",
            principal.username,
        ).firstOrNull()
            ?: return ResponseEntity.status(404)
                .body(mapOf("statusCode" to 404, "message" to "Admin user not found"))

        val role = row["role"]?.toString() ?: "VIEWER"
        return ResponseEntity.ok(
            mapOf(
                "statusCode" to 200,
                "data" to mapOf(
                    "id"          to row["id"].toString(),
                    "email"       to row["email"],
                    "name"        to row["name"],
                    "role"        to role,
                    "status"      to row["status"],
                    "createdAt"   to row["created_at"]?.toString(),
                    "permissions" to parsePermissions(row["permissions"]),
                ),
            )
        )
    }

    // ── List ─────────────────────────────────────────────────────────────────

    /** GET /api/admin/admin-users */
    @GetMapping
    fun list(): ResponseEntity<Map<String, Any?>> {
        val users = jdbc.queryForList(
            """SELECT id, email, name, role, permissions, status, created_at, last_login_at
               FROM ops.admin_users
               ORDER BY created_at DESC"""
        ).map { row ->
            mapOf(
                "id"            to row["id"].toString(),
                "email"         to row["email"],
                "name"          to row["name"],
                "role"          to row["role"],
                "permissions"   to parsePermissions(row["permissions"]),
                "status"        to row["status"],
                "created_at"    to row["created_at"]?.toString(),
                "last_login_at" to row["last_login_at"]?.toString(),
            )
        }
        return ResponseEntity.ok(mapOf("statusCode" to 200, "data" to users))
    }

    // ── Invite ────────────────────────────────────────────────────────────────

    /** POST /api/admin/admin-users/invite */
    @PostMapping("/invite")
    fun invite(
        request: HttpServletRequest,
        @AuthenticationPrincipal principal: UserDetails,
        @RequestBody body: Map<String, Any?>,
    ): ResponseEntity<Map<String, Any?>> {
        val email = body["email"] as? String
            ?: return ResponseEntity.badRequest().body(mapOf("statusCode" to 400, "message" to "email required"))
        val name = body["name"] as? String
        val role = body["role"] as? String ?: "ADMIN"

        @Suppress("UNCHECKED_CAST")
        val permissionsInput = body["permissions"] as? Map<String, Any?>
        val defaultPermissions = mapOf(
            "dashboard" to true, "managers" to true, "workers" to true,
            "jobs" to true, "sites" to true, "notifications" to false, "admin_users" to false,
        )
        val permissionsJson = objectMapper.writeValueAsString(permissionsInput ?: defaultPermissions)

        val token = UUID.randomUUID().toString()

        val invitedByRow = jdbc.queryForList(
            "SELECT id FROM ops.admin_users WHERE email = ?", principal.username
        ).firstOrNull()
        val invitedById = invitedByRow?.get("id")

        jdbc.update(
            """INSERT INTO ops.admin_users
               (email, name, role, permissions, status, invite_token, invite_expires_at, invited_by)
               VALUES (?, ?, ?, ?::jsonb, 'INVITED', ?, NOW() + INTERVAL '7 days', ?::uuid)
               ON CONFLICT (email) DO UPDATE SET
                 name = EXCLUDED.name,
                 role = EXCLUDED.role,
                 permissions = EXCLUDED.permissions,
                 status = 'INVITED',
                 invite_token = EXCLUDED.invite_token,
                 invite_expires_at = EXCLUDED.invite_expires_at""",
            email, name, role, permissionsJson, token, invitedById?.toString()
        )

        val host = request.getHeader("Host") ?: "${request.serverName}:${request.serverPort}"
        val scheme = request.getHeader("X-Forwarded-Proto") ?: request.scheme
        val inviteUrl = "$scheme://$host/accept-invite?token=$token"

        val emailSent = emailService.sendInvite(
            toEmail = email,
            toName = name,
            inviteUrl = inviteUrl,
            invitedByEmail = principal.username,
        )

        return ResponseEntity.ok(mapOf(
            "statusCode" to 200,
            "data" to mapOf("inviteUrl" to inviteUrl, "email" to email, "emailSent" to emailSent),
        ))
    }

    // ── Accept Invite (public) ─────────────────────────────────────────────

    /** POST /api/admin/admin-users/accept-invite — permitted without auth (SecurityConfig) */
    @PostMapping("/accept-invite")
    fun acceptInvite(
        @RequestBody body: Map<String, Any?>,
    ): ResponseEntity<Map<String, Any?>> {
        val token = body["token"] as? String
            ?: return ResponseEntity.badRequest().body(mapOf("statusCode" to 400, "message" to "token required"))
        val password = body["password"] as? String
            ?: return ResponseEntity.badRequest().body(mapOf("statusCode" to 400, "message" to "password required"))
        val name = body["name"] as? String

        val row = jdbc.queryForList(
            """SELECT id FROM ops.admin_users
               WHERE invite_token = ? AND status = 'INVITED'
                 AND (invite_expires_at IS NULL OR invite_expires_at > NOW())""",
            token
        ).firstOrNull()
            ?: return ResponseEntity.status(404).body(
                mapOf("statusCode" to 404, "message" to "유효하지 않거나 만료된 초대 링크입니다")
            )

        val passwordHash = passwordEncoder.encode(password)
        if (name != null) {
            jdbc.update(
                """UPDATE ops.admin_users
                   SET password_hash = ?, status = 'ACTIVE', name = ?,
                       invite_token = NULL, invite_expires_at = NULL
                   WHERE id = ?::uuid""",
                passwordHash, name, row["id"].toString()
            )
        } else {
            jdbc.update(
                """UPDATE ops.admin_users
                   SET password_hash = ?, status = 'ACTIVE',
                       invite_token = NULL, invite_expires_at = NULL
                   WHERE id = ?::uuid""",
                passwordHash, row["id"].toString()
            )
        }

        return ResponseEntity.ok(mapOf("statusCode" to 200, "data" to mapOf("message" to "계정이 활성화되었습니다")))
    }

    // ── Update Permissions ────────────────────────────────────────────────────

    /** PUT /api/admin/admin-users/{id}/permissions */
    @PutMapping("/{id}/permissions")
    fun updatePermissions(
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>,
    ): ResponseEntity<Map<String, Any?>> {
        @Suppress("UNCHECKED_CAST")
        val permissions = body["permissions"] as? Map<String, Any?>
            ?: return ResponseEntity.badRequest().body(mapOf("statusCode" to 400, "message" to "permissions required"))
        val permissionsJson = objectMapper.writeValueAsString(permissions)
        jdbc.update(
            "UPDATE ops.admin_users SET permissions = ?::jsonb WHERE id = ?::uuid",
            permissionsJson, id
        )
        return ResponseEntity.ok(mapOf("statusCode" to 200, "data" to mapOf("ok" to true)))
    }

    // ── Update Role ───────────────────────────────────────────────────────────

    /** PUT /api/admin/admin-users/{id}/role */
    @PutMapping("/{id}/role")
    fun updateRole(
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>,
    ): ResponseEntity<Map<String, Any?>> {
        val role = body["role"] as? String
            ?: return ResponseEntity.badRequest().body(mapOf("statusCode" to 400, "message" to "role required"))
        jdbc.update(
            "UPDATE ops.admin_users SET role = ? WHERE id = ?::uuid",
            role, id
        )
        return ResponseEntity.ok(mapOf("statusCode" to 200, "data" to mapOf("ok" to true)))
    }

    // ── Reset Password ────────────────────────────────────────────────────────

    /** POST /api/admin/admin-users/{id}/reset-password */
    @PostMapping("/{id}/reset-password")
    fun resetPassword(
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>,
    ): ResponseEntity<Map<String, Any?>> {
        val password = body["password"] as? String
            ?: return ResponseEntity.badRequest().body(mapOf("statusCode" to 400, "message" to "password required"))
        val passwordHash = passwordEncoder.encode(password)
        jdbc.update(
            "UPDATE ops.admin_users SET password_hash = ? WHERE id = ?::uuid",
            passwordHash, id
        )
        return ResponseEntity.ok(mapOf("statusCode" to 200, "data" to mapOf("ok" to true)))
    }

    // ── Disable ───────────────────────────────────────────────────────────────

    /** DELETE /api/admin/admin-users/{id} — soft disable */
    @DeleteMapping("/{id}")
    fun disableUser(
        @PathVariable id: String,
    ): ResponseEntity<Map<String, Any?>> {
        val email = jdbc.queryForList(
            "SELECT email FROM ops.admin_users WHERE id = ?::uuid", id
        ).firstOrNull()?.get("email")?.toString()
        if (email == PROTECTED_EMAIL) {
            return ResponseEntity.status(403)
                .body(mapOf("statusCode" to 403, "message" to "슈퍼어드민 계정은 비활성화할 수 없습니다"))
        }
        jdbc.update(
            "UPDATE ops.admin_users SET status = 'DISABLED' WHERE id = ?::uuid",
            id
        )
        return ResponseEntity.ok(mapOf("statusCode" to 200, "data" to mapOf("ok" to true)))
    }

    // ── Permanent Delete ──────────────────────────────────────────────────────

    /** DELETE /api/admin/admin-users/{id}/permanent — hard delete */
    @DeleteMapping("/{id}/permanent")
    fun deleteUser(
        @PathVariable id: String,
    ): ResponseEntity<Map<String, Any?>> {
        val email = jdbc.queryForList(
            "SELECT email FROM ops.admin_users WHERE id = ?::uuid", id
        ).firstOrNull()?.get("email")?.toString()
        if (email == PROTECTED_EMAIL) {
            return ResponseEntity.status(403)
                .body(mapOf("statusCode" to 403, "message" to "슈퍼어드민 계정은 삭제할 수 없습니다"))
        }
        jdbc.update("DELETE FROM ops.admin_users WHERE id = ?::uuid", id)
        return ResponseEntity.ok(mapOf("statusCode" to 200, "data" to mapOf("ok" to true)))
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    @Suppress("UNCHECKED_CAST")
    private fun parsePermissions(pgObject: Any?): Map<String, Boolean> {
        val jsonStr = pgObject?.toString() ?: return emptyMap()
        return try {
            val raw = objectMapper.readValue(jsonStr, Map::class.java) as Map<String, Any>
            raw.entries.associate { (k, v) -> k to (v as? Boolean ?: false) }
        } catch (e: Exception) {
            emptyMap()
        }
    }
}
