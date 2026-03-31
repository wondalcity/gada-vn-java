package vn.gada.admin.service

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class AdminUserDetailsService(private val jdbc: JdbcTemplate) : UserDetailsService {

    override fun loadUserByUsername(email: String): UserDetails {
        val rows = jdbc.queryForList(
            """SELECT email, password_hash, role
               FROM ops.admin_users
               WHERE email = ? AND status = 'ACTIVE' AND password_hash IS NOT NULL""",
            email,
        )
        if (rows.isEmpty()) throw UsernameNotFoundException("Admin user not found: $email")

        val row = rows[0]
        val role = (row["role"] as String).replace("_", "") // SUPER_ADMIN → SUPERADMIN

        return User.withUsername(row["email"] as String)
            .password(row["password_hash"] as String)
            .roles("ADMIN", role)
            .build()
    }
}
