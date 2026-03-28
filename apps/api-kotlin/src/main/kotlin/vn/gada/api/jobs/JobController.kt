package vn.gada.api.jobs

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import vn.gada.api.common.exception.ForbiddenException
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.security.AuthUser

@RestController
@RequestMapping("/jobs")
class JobController(private val jobService: JobService) {

    /** GET /jobs — Public job listing */
    @GetMapping
    fun listJobs(
        @RequestParam(required = false) lat: Double?,
        @RequestParam(required = false) lng: Double?,
        @RequestParam(required = false, defaultValue = "50") radiusKm: Int,
        @RequestParam(required = false, defaultValue = "1") page: Int,
        @RequestParam(required = false, defaultValue = "20") limit: Int,
        @RequestParam(required = false) tradeId: Int?,
        @RequestParam(required = false) province: String?
    ): ResponseEntity<Map<String, Any?>> {
        val query = JobRepository.JobListQuery(
            lat = lat, lng = lng, radiusKm = radiusKm,
            page = page, limit = limit, tradeId = tradeId, province = province
        )
        return ok(jobService.listJobs(query))
    }

    /** GET /jobs/mine — Manager's own jobs */
    @GetMapping("/mine")
    fun getMyJobs(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(jobService.getMyJobs(u.id))
    }

    /** GET /jobs/date/:date — Daily feed (public) */
    @GetMapping("/date/{date}")
    fun getDailyFeed(
        @PathVariable date: String,
        @RequestParam(required = false, defaultValue = "1") page: Int,
        @RequestParam(required = false, defaultValue = "20") limit: Int
    ): ResponseEntity<Map<String, Any?>> {
        return ok(jobService.getDailyFeed(date, page, limit))
    }

    /** GET /jobs/:id — Public job detail */
    @GetMapping("/{id}")
    fun getJob(@PathVariable id: String): ResponseEntity<Map<String, Any?>> {
        return ok(jobService.getJobById(id))
    }

    /** POST /jobs — Create job (manager) */
    @PostMapping
    fun createJob(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(jobService.createJob(u.id, body))
    }

    /** PUT /jobs/:id — Update job (manager) */
    @PutMapping("/{id}")
    fun updateJob(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(jobService.updateJob(id, u.id, body))
    }

    /** DELETE /jobs/:id — Soft-delete job (manager) */
    @DeleteMapping("/{id}")
    fun deleteJob(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(jobService.deleteJob(id, u.id))
    }

    private fun requireManager(user: AuthUser?): AuthUser {
        if (user == null) throw UnauthorizedException("Unauthorized")
        if (user.role != "MANAGER" && user.role != "ADMIN") throw ForbiddenException("MANAGER role required")
        return user
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
