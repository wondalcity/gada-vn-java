package vn.gada.api.workers

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import vn.gada.api.common.exception.ForbiddenException
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.security.AuthUser

@RestController
@RequestMapping("/workers")
class WorkerController(private val workerService: WorkerService) {

    /** GET /workers/me */
    @GetMapping("/me")
    fun getMyProfile(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        val u = requireWorker(user)
        return ok(workerService.getProfile(u.id))
    }

    /** PUT /workers/me */
    @PutMapping("/me")
    fun updateMyProfile(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireWorker(user)
        return ok(workerService.updateProfile(u.id, body))
    }

    /** GET /workers/hires */
    @GetMapping("/hires")
    fun getMyHires(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        val u = requireWorker(user)
        return ok(workerService.getHires(u.id))
    }

    /** GET /workers/attendance */
    @GetMapping("/attendance")
    fun getMyAttendance(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestParam(required = false) jobId: String?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireWorker(user)
        return ok(workerService.getAttendance(u.id, jobId))
    }

    private fun requireWorker(user: AuthUser?): AuthUser {
        if (user == null) throw UnauthorizedException("Unauthorized")
        if (user.role != "WORKER" && user.role != "MANAGER" && user.role != "ADMIN") throw ForbiddenException("WORKER role required")
        return user
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
