package vn.gada.admin.config

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.core.AuthenticationException
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler

@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun authenticationManager(config: AuthenticationConfiguration): AuthenticationManager =
        config.authenticationManager

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .authorizeHttpRequests { auth ->
                auth
                    // Health check — unauthenticated (needed for Docker HEALTHCHECK + nginx)
                    .requestMatchers("/health").permitAll()
                    // Static assets and login/logout always allowed
                    .requestMatchers("/login", "/assets/**", "/favicon.ico", "/*.js", "/*.css").permitAll()
                    // Accept-invite page and its API call are public (user not yet logged in)
                    .requestMatchers("/accept-invite").permitAll()
                    .requestMatchers("/api/admin/admin-users/accept-invite").permitAll()
                    .anyRequest().authenticated()
            }
            .formLogin { form ->
                form
                    .loginPage("/login")
                    .loginProcessingUrl("/login")
                    .defaultSuccessUrl("/", true)
                    .failureHandler(SimpleUrlAuthenticationFailureHandler("/login?error"))
                    .permitAll()
            }
            .logout { logout ->
                logout
                    .logoutUrl("/logout")
                    .logoutSuccessUrl("/login?logout")
                    .invalidateHttpSession(true)
                    .deleteCookies("JSESSIONID")
            }
            .sessionManagement { session ->
                session.maximumSessions(5)
            }
            .exceptionHandling { ex ->
                ex.authenticationEntryPoint { request: HttpServletRequest, response: HttpServletResponse, _: AuthenticationException ->
                    if (request.requestURI.startsWith("/api/")) {
                        response.status = 401
                        response.contentType = "application/json"
                        response.writer.write("""{"error":"Unauthorized","status":401}""")
                    } else {
                        response.sendRedirect("/login")
                    }
                }
            }

        return http.build()
    }
}
