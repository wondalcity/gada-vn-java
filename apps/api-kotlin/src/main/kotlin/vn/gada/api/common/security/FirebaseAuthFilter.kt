package vn.gada.api.common.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import vn.gada.api.common.database.DatabaseService
import vn.gada.api.common.firebase.FirebaseService

@Component
class FirebaseAuthFilter(
    private val firebaseService: FirebaseService,
    private val db: DatabaseService
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(FirebaseAuthFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response)
            return
        }

        val token = authHeader.removePrefix("Bearer ").trim()

        try {
            val authUser = resolveUser(token)
            if (authUser != null) {
                val auth = UsernamePasswordAuthenticationToken(
                    authUser,
                    null,
                    listOf(SimpleGrantedAuthority("ROLE_${authUser.role}"))
                )
                SecurityContextHolder.getContext().authentication = auth
            }
        } catch (e: Exception) {
            log.debug("Auth filter error: {}", e.message)
        }

        filterChain.doFilter(request, response)
    }

    private fun resolveUser(token: String): AuthUser? {
        // Dev mode: accept dev_<userId> tokens without Firebase verification
        if (token.startsWith("dev_")) {
            val userId = token.removePrefix("dev_")
            val rows = db.queryForList(
                "SELECT id, role, status FROM auth.users WHERE id = ?",
                userId
            )
            if (rows.isEmpty()) return null
            val row = rows[0]
            if (row["status"] == "SUSPENDED") return null
            return AuthUser(
                id = row["id"] as String,
                firebaseUid = userId,
                role = row["role"] as String,
                phone = null,
                email = null
            )
        }

        // Firebase token verification
        val decoded = firebaseService.verifyIdToken(token) ?: return null

        val rows = db.queryForList(
            "SELECT id, role, status FROM auth.users WHERE firebase_uid = ?",
            decoded.uid
        )
        if (rows.isEmpty()) return null
        val row = rows[0]
        if (row["status"] == "SUSPENDED") return null

        return AuthUser(
            id = row["id"] as String,
            firebaseUid = decoded.uid,
            role = row["role"] as String,
            phone = decoded.claims["phone_number"] as? String,
            email = decoded.claims["email"] as? String
        )
    }
}
