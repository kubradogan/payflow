package com.payflow.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.Customizer.withDefaults
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.provisioning.InMemoryUserDetailsManager
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

/*
 * Security configuration for the PayFlow application.
 * Defines authentication, authorization rules and CORS settings.
 */
@Configuration
class SecurityConfig {

    /*
     * Password encoder used for hashing admin credentials.
     * BCrypt is sufficient for demo and development purposes.
     */
    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    /*
     * In-memory user store for administrative access.
     * This is intentionally simple and suitable for a demo environment.
     */
    @Bean
    fun userDetailsService(passwordEncoder: PasswordEncoder): UserDetailsService {
        val admin = User.withUsername("admin")
            .password(passwordEncoder.encode("admin123"))
            .roles("ADMIN")
            .build()

        return InMemoryUserDetailsManager(admin)
    }

    /*
     * CORS configuration allowing requests from the React development server.
     * Required for the Admin UI to communicate with the backend.
     */
    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration()

        // React development server origin
        config.allowedOriginPatterns = listOf("http://localhost:3000")
        config.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
        config.allowedHeaders = listOf("*")
        config.allowCredentials = false
        config.maxAge = 3600

        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", config)
        return source
    }

    /*
     * Main Spring Security filter chain.
     * Defines which endpoints are public and which require authentication.
     */
    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            // CSRF disabled as the system exposes stateless REST APIs
            .csrf { it.disable() }

            // Enables CORS using the configuration defined above
            .cors { }

            .authorizeHttpRequests { auth ->
                auth
                    // Always allow preflight (CORS OPTIONS) requests
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                    // Admin endpoints require ADMIN role
                    .requestMatchers("/admin/**").hasRole("ADMIN")

                    // Public endpoints (payment API, docs, webhooks, metrics)
                    .requestMatchers(
                        "/payments/**",
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/actuator/**",
                        "/webhooks/**"
                    ).permitAll()

                    // Any other request is allowed by default
                    .anyRequest().permitAll()
            }
            // HTTP Basic authentication for admin access
            .httpBasic(withDefaults())

        return http.build()
    }
}