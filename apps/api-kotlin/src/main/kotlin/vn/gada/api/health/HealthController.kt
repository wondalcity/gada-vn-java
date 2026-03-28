package vn.gada.api.health

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

@RestController
@RequestMapping("/health")
class HealthController {

    @GetMapping
    fun health(): ResponseEntity<Map<String, Any?>> {
        return ResponseEntity.ok(
            mapOf(
                "statusCode" to 200,
                "data" to mapOf(
                    "status" to "ok",
                    "timestamp" to Instant.now().toString(),
                    "service" to "gada-api-kotlin"
                )
            )
        )
    }
}
