package vn.gada.api.managers

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import vn.gada.api.common.exception.ForbiddenException
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.security.AuthUser

@RestController
@RequestMapping("/manager/sites")
class SiteController(private val siteRepo: SiteRepository) {

    /** GET /manager/sites */
    @GetMapping
    fun list(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(siteRepo.listByUser(u.id))
    }

    /** POST /manager/sites */
    @PostMapping
    fun create(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val result = siteRepo.create(
            userId = u.id,
            name = body["name"] as String,
            address = body["address"] as String,
            province = body["province"] as String,
            district = body["district"] as? String,
            lat = (body["lat"] as? Number)?.toDouble(),
            lng = (body["lng"] as? Number)?.toDouble(),
            siteType = body["siteType"] as? String
        )
        return ok(result)
    }

    /** GET /manager/sites/:id */
    @GetMapping("/{id}")
    fun getOne(
        @AuthenticationPrincipal user: AuthUser?,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(siteRepo.findOne(id, u.id))
    }

    /** PUT /manager/sites/:id */
    @PutMapping("/{id}")
    fun update(
        @AuthenticationPrincipal user: AuthUser?,
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val result = siteRepo.update(
            siteId = id,
            userId = u.id,
            name = body["name"] as? String,
            address = body["address"] as? String,
            province = body["province"] as? String,
            district = body["district"] as? String,
            lat = (body["lat"] as? Number)?.toDouble(),
            lng = (body["lng"] as? Number)?.toDouble(),
            siteType = body["siteType"] as? String,
            status = body["status"] as? String
        )
        return ok(result)
    }

    /** PATCH /manager/sites/:id/status */
    @PatchMapping("/{id}/status")
    fun updateStatus(
        @AuthenticationPrincipal user: AuthUser?,
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val result = siteRepo.update(
            siteId = id, userId = u.id,
            name = null, address = null, province = null, district = null,
            lat = null, lng = null, siteType = null,
            status = body["status"] as? String
        )
        return ok(result)
    }

    /** GET /manager/sites/:id/jobs */
    @GetMapping("/{id}/jobs")
    fun getJobs(
        @AuthenticationPrincipal user: AuthUser?,
        @PathVariable id: String
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(siteRepo.getJobs(id, u.id))
    }

    /** POST /manager/sites/:id/images */
    @PostMapping("/{id}/images")
    fun addImage(
        @AuthenticationPrincipal user: AuthUser?,
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val key = body["key"] as String
        return ok(siteRepo.addImage(id, u.id, key))
    }

    /** DELETE /manager/sites/:id/images/:index */
    @DeleteMapping("/{id}/images/{index}")
    fun removeImage(
        @AuthenticationPrincipal user: AuthUser?,
        @PathVariable id: String,
        @PathVariable index: Int
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(siteRepo.removeImage(id, u.id, index))
    }

    /** PATCH /manager/sites/:id/cover */
    @PatchMapping("/{id}/cover")
    fun setCover(
        @AuthenticationPrincipal user: AuthUser?,
        @PathVariable id: String,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val index = (body["index"] as? Number)?.toInt() ?: 0
        return ok(siteRepo.setCover(id, u.id, index))
    }

    private fun requireManager(user: AuthUser?): AuthUser {
        if (user == null) throw UnauthorizedException("Unauthorized")
        if (user.role != "MANAGER" && user.role != "ADMIN") throw ForbiddenException("MANAGER role required")
        return user
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
