package com.mockmate.ai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Security Configuration for MockMate AI.
 * Provides an enterprise-grade BCrypt password hashing bean with strength factor 12.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt with 12 rounds of hashing (industry standard salt + hash)
        return new BCryptPasswordEncoder(12);
    }
}
