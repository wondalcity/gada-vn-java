package vn.gada.api.managers

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import vn.gada.api.common.database.DatabaseService
import vn.gada.api.common.exception.BadRequestException
import vn.gada.api.common.exception.ForbiddenException
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.security.AuthUser

@RestController
@RequestMapping("/manager/companies")
class ManagerCompanyController(
    private val db: DatabaseService
) {

    /** GET /manager/companies — list all construction companies for picker */
    @GetMapping
    fun list(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        requireManager(user)
        val rows = db.queryForList(
            """SELECT id, name, business_reg_no, contact_name, contact_phone
               FROM app.construction_companies
               ORDER BY name"""
        )
        return ok(rows)
    }

    /** POST /manager/companies — create a new construction company inline */
    @PostMapping
    fun create(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        requireManager(user)
        val name = body["name"] as? String ?: throw BadRequestException("name is required")
        val row = db.queryForList(
            """INSERT INTO app.construction_companies (name, contact_name, contact_phone, business_reg_no)
               VALUES (?, ?, ?, ?)
               RETURNING id, name, business_reg_no, contact_name, contact_phone""",
            name,
            body["contactName"] as? String,
            body["contactPhone"] as? String,
            body["businessRegNo"] as? String
        ).first()
        return ok(row)
    }

    private fun requireManager(user: AuthUser?): AuthUser {
        if (user == null) throw UnauthorizedException("Unauthorized")
        if (user.role != "MANAGER" && user.role != "ADMIN") throw ForbiddenException("MANAGER role required")
        return user
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
