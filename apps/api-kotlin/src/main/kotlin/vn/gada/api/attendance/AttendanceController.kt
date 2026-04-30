package vn.gada.api.attendance

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import vn.gada.api.common.exception.ForbiddenException
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.security.AuthUser

@RestController
class AttendanceController(private val attendanceService: AttendanceService) {

    /** GET /jobs/:jobId/attendance — Manager fetches attendance records for a job */
    @GetMapping("/jobs/{jobId}/attendance")
    fun getJobAttendance(
        @PathVariable jobId: String,
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(attendanceService.findByJob(jobId, u.id))
    }

    /** GET /attendance/:id/history — Get status change history for an attendance record */
    @GetMapping("/attendance/{id}/history")
    fun getAttendanceHistory(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        val rows = attendanceService.getStatusHistory(id)
        return ok(rows)
    }

    /** PUT /attendance/:id — Manager updates a single attendance record */
    @PutMapping("/attendance/{id}")
    fun updateAttendance(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val status = body["status"] as? String
            ?: throw vn.gada.api.common.exception.BadRequestException("status is required")
        val notes = body["notes"] as? String
        return ok(attendanceService.update(id, u.id, status, notes))
    }

    /** POST /jobs/:jobId/attendance/bulk — Manager bulk upsert attendance */
    @PostMapping("/jobs/{jobId}/attendance/bulk")
    fun bulkUpsertAttendance(
        @PathVariable jobId: String,
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        @Suppress("UNCHECKED_CAST")
        val records = body["records"] as? List<Map<String, Any?>> ?: emptyList()
        return ok(attendanceService.bulkUpsert(jobId, u.id, records))
    }

    private fun requireManager(user: AuthUser?): AuthUser {
        if (user == null) throw UnauthorizedException("Unauthorized")
        if (user.role != "MANAGER" && user.role != "ADMIN") throw ForbiddenException("MANAGER role required")
        return user
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
