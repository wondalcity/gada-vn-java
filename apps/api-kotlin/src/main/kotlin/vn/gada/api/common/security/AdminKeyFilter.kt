package vn.gada.api.common.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Stores the admin-key validation result as a request attribute
 * so SecurityConfig can use it in a custom filter.
 */
@Component
class AdminKeyFilter(
    @Value("\${gada.admin.service-key}") private val serviceKey: String
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(AdminKeyFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val path = request.requestURI
        if (path.contains("/admin")) {
            val key = request.getHeader("x-admin-key")
            if (key != null && key == serviceKey) {
                request.setAttribute("admin_key_valid", true)
            }
        }
        filterChain.doFilter(request, response)
    }

    companion object {
        /**
         * Utility to check admin key from a request attribute (set by this filter)
         * or directly from the header.
         */
        fun isAdminKeyValid(request: HttpServletRequest, serviceKey: String): Boolean {
            val attrValid = request.getAttribute("admin_key_valid") as? Boolean
            if (attrValid == true) return true
            val key = request.getHeader("x-admin-key") ?: return false
            return key == serviceKey
        }
    }
}
