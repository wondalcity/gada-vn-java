package vn.gada.admin.controller

import org.springframework.core.io.ClassPathResource
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

// Serves index.html for all non-API, non-asset GET routes (React Router SPA).
@RestController
class SpaController {

    private val indexHtml: ByteArray by lazy {
        ClassPathResource("static/index.html").inputStream.use { it.readBytes() }
    }

    @GetMapping(
        value = ["/", "/login", "/managers", "/managers/**",
                 "/workers", "/workers/**", "/jobs", "/jobs/**",
                 "/sites", "/sites/**",
                 "/companies", "/companies/**",
                 "/notifications", "/admin-users", "/accept-invite",
                 "/settings"],
    )
    fun spa(): ResponseEntity<ByteArray> =
        ResponseEntity.ok()
            .contentType(MediaType.TEXT_HTML)
            .body(indexHtml)
}
