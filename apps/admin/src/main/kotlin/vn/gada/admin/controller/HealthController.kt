package vn.gada.admin.controller

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

@RestController
class HealthController {

    @GetMapping("/health")
    fun health(): ResponseEntity<Map<String, Any>> = ResponseEntity.ok(
        mapOf(
            "status" to "ok",
            "timestamp" to Instant.now().toString(),
            "service" to "gada-admin"
        )
    )
}
