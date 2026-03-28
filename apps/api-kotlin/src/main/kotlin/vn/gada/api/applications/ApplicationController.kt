package vn.gada.api.applications

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import vn.gada.api.common.exception.ForbiddenException
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.security.AuthUser

@RestController
class ApplicationController(private val applicationService: ApplicationService) {

    /** POST /jobs/:jobId/apply — Worker applies to a job */
    @PostMapping("/jobs/{jobId}/apply")
    fun applyToJob(
        @PathVariable jobId: String,
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody(required = false) body: Map<String, Any?>?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireWorker(user)
        return ok(applicationService.apply(u.id, jobId))
    }

    /** GET /applications/mine — Worker fetches their own applications */
    @GetMapping("/applications/mine")
    fun getMyApplications(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestParam(required = false, defaultValue = "1") page: Int,
        @RequestParam(required = false, defaultValue = "20") limit: Int
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireWorker(user)
        return ok(applicationService.findByWorker(u.id, page, limit))
    }

    /** GET /jobs/:jobId/applications — Manager fetches applications for a job */
    @GetMapping("/jobs/{jobId}/applications")
    fun getJobApplications(
        @PathVariable jobId: String,
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(applicationService.findByJob(jobId, u.id))
    }

    /** GET /applications/job/:jobId — Alias (mobile-friendly) */
    @GetMapping("/applications/job/{jobId}")
    fun getJobApplicationsAlias(
        @PathVariable jobId: String,
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(applicationService.findByJob(jobId, u.id))
    }

    /** PUT /applications/:id/status — Manager updates application status */
    @PutMapping("/applications/{id}/status")
    fun updateStatus(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val status = body["status"] as? String
            ?: throw vn.gada.api.common.exception.BadRequestException("status is required")
        return ok(applicationService.updateStatus(id, u.id, status))
    }

    private fun requireWorker(user: AuthUser?): AuthUser {
        if (user == null) throw UnauthorizedException("Unauthorized")
        if (user.role != "WORKER" && user.role != "ADMIN") throw ForbiddenException("WORKER role required")
        return user
    }

    private fun requireManager(user: AuthUser?): AuthUser {
        if (user == null) throw UnauthorizedException("Unauthorized")
        if (user.role != "MANAGER" && user.role != "ADMIN") throw ForbiddenException("MANAGER role required")
        return user
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
