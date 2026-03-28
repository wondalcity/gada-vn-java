package vn.gada.admin.controller

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import vn.gada.admin.service.ApiProxyService

// Proxies all /api/* requests to the NestJS backend.
// React SPA calls /api/admin/managers  →  forwarded to {API_BASE}/admin/managers
@RestController
@RequestMapping("/api")
class ProxyController(private val proxy: ApiProxyService) {

    @RequestMapping("/**")
    fun proxyToApi(request: HttpServletRequest): ResponseEntity<ByteArray> {
        // Strip "/api" prefix to get the path for NestJS
        val apiPath = request.requestURI.removePrefix(request.contextPath).removePrefix("/api")

        val method = HttpMethod.valueOf(request.method)
        val queryString = request.queryString
        val body = request.inputStream.readBytes().takeIf { it.isNotEmpty() }
        val contentType = request.contentType?.let { MediaType.parseMediaType(it) }

        return proxy.proxy(method, apiPath, queryString, body, contentType)
    }
}
