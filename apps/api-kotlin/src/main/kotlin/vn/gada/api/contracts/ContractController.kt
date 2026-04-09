package vn.gada.api.contracts

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import vn.gada.api.common.exception.ForbiddenException
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.security.AuthUser

@RestController
@RequestMapping("/contracts")
class ContractController(private val contractService: ContractService) {

    /** POST /contracts/generate — Manager generates a contract for an accepted application */
    @PostMapping("/generate")
    fun generateContract(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        val applicationId = body["applicationId"] as? String
            ?: throw vn.gada.api.common.exception.BadRequestException("applicationId is required")
        return ok(contractService.generate(u.id, applicationId))
    }

    /** GET /contracts/mine — Worker lists their own contracts */
    @GetMapping("/mine")
    fun getMyContracts(
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireWorker(user)
        return ok(contractService.findByWorker(u.id))
    }

    /** GET /contracts/mine-as-manager — Manager lists contracts they issued */
    @GetMapping("/mine-as-manager")
    fun getMyContractsAsManager(
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireManager(user)
        return ok(contractService.findByManager(u.id))
    }

    /** GET /contracts/:id — Worker or Manager retrieves a contract */
    @GetMapping("/{id}")
    fun getContract(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?
    ): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        return ok(contractService.findById(id, user.id))
    }

    /** POST /contracts/:id/sign — Worker signs a contract */
    @PostMapping("/{id}/sign")
    fun signContract(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody(required = false) body: Map<String, Any?>?
    ): ResponseEntity<Map<String, Any?>> {
        val u = requireWorker(user)
        val signatureData = body?.get("signatureData") as? String
        return ok(contractService.sign(id, u.id, signatureData))
    }

    private fun requireManager(user: AuthUser?): AuthUser {
        if (user == null) throw UnauthorizedException("Unauthorized")
        if (user.role != "MANAGER" && user.role != "ADMIN") throw ForbiddenException("MANAGER role required")
        return user
    }

    private fun requireWorker(user: AuthUser?): AuthUser {
        if (user == null) throw UnauthorizedException("Unauthorized")
        if (user.role != "WORKER" && user.role != "ADMIN") throw ForbiddenException("WORKER role required")
        return user
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
