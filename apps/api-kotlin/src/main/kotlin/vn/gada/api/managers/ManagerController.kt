package vn.gada.api.managers

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import vn.gada.api.common.exception.ForbiddenException
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.security.AuthUser

@RestController
@RequestMapping("/managers")
class ManagerController(private val managerService: ManagerService) {

    /** POST /managers/register — Any authenticated user can apply to become a manager */
    @PostMapping("/register")
    fun register(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        return ok(managerService.register(user.id, body))
    }

    /** GET /managers/registration-status */
    @GetMapping("/registration-status")
    fun getRegistrationStatus(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        return ok(managerService.getRegistrationStatus(user.id))
    }

    /** GET /managers/me */
    @GetMapping("/me")
    fun getMyProfile(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(managerService.getProfile(u.id))
    }

    /** PUT /managers/me */
    @PutMapping("/me")
    fun updateMyProfile(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(managerService.updateProfile(u.id, body))
    }

    private fun requireManager(user: AuthUser?): AuthUser {
        if (user == null) throw UnauthorizedException("Unauthorized")
        if (user.role != "MANAGER" && user.role != "ADMIN") throw ForbiddenException("MANAGER role required")
        return user
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
