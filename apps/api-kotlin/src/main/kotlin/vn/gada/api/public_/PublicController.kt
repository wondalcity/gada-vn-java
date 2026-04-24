package vn.gada.api.public_

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import vn.gada.api.common.exception.NotFoundException

@RestController
@RequestMapping("/public")
class PublicController(private val publicService: PublicService) {

    /** GET /public/jobs */
    @GetMapping("/jobs")
    fun listJobs(
        @RequestParam(required = false) province: String?,
        @RequestParam(required = false) tradeId: String?,
        @RequestParam(required = false) site: String?,
        @RequestParam(required = false) page: String?,
        @RequestParam(required = false) lat: String?,
        @RequestParam(required = false) lng: String?,
        @RequestParam(required = false) radiusKm: String?,
        @RequestParam(required = false) statusFilter: String?,
        @RequestParam(required = false) minWage: String?,
        @RequestParam(required = false) maxWage: String?,
        @RequestParam(required = false) minExp: String?
    ): ResponseEntity<Map<String, Any?>> {
        val validStatuses = setOf("CLOSING_SOON", "CLOSED")
        val parsedStatus = if (statusFilter != null && validStatuses.contains(statusFilter)) statusFilter else null
        val validExpFilters = setOf("none", "lt1", "1to2", "2to3", "gte3")
        val parsedExp = if (minExp != null && validExpFilters.contains(minExp)) minExp else null

        val params = mapOf<String, Any?>(
            "province" to province,
            "tradeId" to tradeId?.toIntOrNull(),
            "site" to site,
            "page" to (page?.toIntOrNull() ?: 1),
            "lat" to lat?.toDoubleOrNull(),
            "lng" to lng?.toDoubleOrNull(),
            "radiusKm" to radiusKm?.let { minOf(200.0, it.toDoubleOrNull() ?: 50.0) },
            "statusFilter" to parsedStatus,
            "minWage" to minWage?.toLongOrNull(),
            "maxWage" to maxWage?.toLongOrNull(),
            "minExp" to parsedExp
        )

        return ok(publicService.listJobs(params))
    }

    /** GET /public/wage-stats */
    @GetMapping("/wage-stats")
    fun getWageStats(): ResponseEntity<Map<String, Any?>> {
        return ok(publicService.getWageStats())
    }

    /** GET /public/jobs/:slug */
    @GetMapping("/jobs/{slug}")
    fun getJobBySlug(@PathVariable slug: String): ResponseEntity<Map<String, Any?>> {
        val job = publicService.getJobBySlug(slug)
            ?: throw NotFoundException("Job not found: $slug")
        return ok(job)
    }

    /** GET /public/sites/:slug */
    @GetMapping("/sites/{slug}")
    fun getSiteBySlug(@PathVariable slug: String): ResponseEntity<Map<String, Any?>> {
        val site = publicService.getSiteById(slug)
            ?: throw NotFoundException("Site not found: $slug")
        return ok(site)
    }

    /** GET /public/provinces */
    @GetMapping("/provinces")
    fun getProvinces(): ResponseEntity<Map<String, Any?>> {
        return ok(publicService.getProvinces())
    }

    /** GET /public/trades */
    @GetMapping("/trades")
    fun getTrades(): ResponseEntity<Map<String, Any?>> {
        return ok(publicService.getTrades())
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
