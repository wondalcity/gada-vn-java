package vn.gada.admin.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.servlet.http.HttpServletResponseWrapper
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Ensures static assets under /assets/ are served with correct MIME types.
 *
 * Spring Boot 3.2 disables PathExtensionContentNegotiationStrategy by default,
 * causing ResourceHttpRequestHandler to fall back to application/octet-stream
 * for hashed filenames on Alpine Linux where the OS mime.types is minimal.
 * X-Content-Type-Options: nosniff (added by Spring Security) then causes
 * browsers to refuse loading module scripts.
 */
@Component
class WebMvcConfig : OncePerRequestFilter() {

    companion object {
        private val MIME_MAP = mapOf(
            ".js"    to "application/javascript; charset=utf-8",
            ".mjs"   to "application/javascript; charset=utf-8",
            ".css"   to "text/css; charset=utf-8",
            ".woff"  to "font/woff",
            ".woff2" to "font/woff2",
            ".svg"   to "image/svg+xml",
            ".ico"   to "image/x-icon",
        )
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
    ) {
        val uri = request.requestURI
        val mime = MIME_MAP.entries.firstOrNull { uri.endsWith(it.key) }?.value
        if (mime != null) {
            chain.doFilter(request, MimeOverrideWrapper(response, mime))
        } else {
            chain.doFilter(request, response)
        }
    }

    private class MimeOverrideWrapper(
        response: HttpServletResponse,
        private val mimeType: String,
    ) : HttpServletResponseWrapper(response) {
        override fun setContentType(type: String) = super.setContentType(mimeType)
        override fun setHeader(name: String, value: String) {
            if (name.equals("Content-Type", ignoreCase = true)) super.setContentType(mimeType)
            else super.setHeader(name, value)
        }
    }
}
