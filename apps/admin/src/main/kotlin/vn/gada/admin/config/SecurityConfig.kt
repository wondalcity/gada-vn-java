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
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler

@Configuration
@EnableWebSecurity
class SecurityConfig(private val props: AppProperties) {

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun userDetailsService(encoder: PasswordEncoder): UserDetailsService {
        // If no hash configured, generate a placeholder (login will fail gracefully)
        val hash = if (props.passwordHash.isNotBlank()) props.passwordHash
                   else encoder.encode("__not_set__")

        val user = User.withUsername(props.username)
            .password(hash)
            .roles("ADMIN")
            .build()

        return org.springframework.security.provisioning.InMemoryUserDetailsManager(user)
    }

    @Bean
    fun authenticationManager(config: AuthenticationConfiguration): AuthenticationManager =
        config.authenticationManager

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/login", "/assets/**", "/favicon.ico", "/*.js", "/*.css").permitAll()
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
