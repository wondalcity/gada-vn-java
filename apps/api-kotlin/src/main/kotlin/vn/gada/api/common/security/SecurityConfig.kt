package vn.gada.api.common.security

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val firebaseAuthFilter: FirebaseAuthFilter,
    private val adminKeyFilter: AdminKeyFilter
) {

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors { it.configurationSource(corsConfigurationSource()) }
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    // Public endpoints — no auth required
                    .requestMatchers(HttpMethod.POST, "/auth/otp/send").permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/otp/verify").permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/verify-token").permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/login").permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/social/facebook").permitAll()
                    .requestMatchers(HttpMethod.GET, "/public/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/jobs").permitAll()
                    .requestMatchers(HttpMethod.GET, "/jobs/date/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/jobs/{id}").permitAll()
                    .requestMatchers(HttpMethod.GET, "/health").permitAll()
                    // Admin endpoints — checked in controller via x-admin-key header
                    .requestMatchers("/admin/**").permitAll()
                    // All others require authentication (populated by FirebaseAuthFilter)
                    .anyRequest().authenticated()
            }
            .addFilterBefore(adminKeyFilter, UsernamePasswordAuthenticationFilter::class.java)
            .addFilterBefore(firebaseAuthFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration()
        config.allowedOriginPatterns = listOf("*")
        config.allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        config.allowedHeaders = listOf("*")
        config.allowCredentials = true

        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", config)
        return source
    }
}
