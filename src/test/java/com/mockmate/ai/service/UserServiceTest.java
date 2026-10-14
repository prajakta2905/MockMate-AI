package com.mockmate.ai.service;

import com.mockmate.ai.config.SecurityConfig;
import com.mockmate.ai.entity.UserEntity;
import com.mockmate.ai.model.User;
import com.mockmate.ai.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = new SecurityConfig().passwordEncoder();
        when(userRepository.existsByEmail("demo@mockmate.ai")).thenReturn(true);
        userService = new UserService(userRepository, passwordEncoder);
    }

    @Test
    @DisplayName("Should hash password with BCrypt on registration and not expose password in User DTO")
    void testRegisterUserWithBCrypt() {
        when(userRepository.existsByEmail("candidate@test.com")).thenReturn(false);

        UserEntity savedEntity = new UserEntity("candidate@test.com", "Test User", "hashed_pwd");
        savedEntity.setId(101L);
        when(userRepository.save(any(UserEntity.class))).thenReturn(savedEntity);

        User registered = userService.registerUser("candidate@test.com", "Test User", "secret123");

        assertNotNull(registered);
        assertEquals("101", registered.getId());
        assertEquals("candidate@test.com", registered.getEmail());
        assertNull(registered.getPassword(), "User model should not expose password");

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        UserEntity entityToSave = captor.getValue();

        assertNotEquals("secret123", entityToSave.getPassword(), "Password must not be stored in plaintext");
        assertTrue(entityToSave.getPassword().startsWith("$2a$") || entityToSave.getPassword().startsWith("$2b$"),
                "Password must be formatted as a valid BCrypt hash");
        assertTrue(passwordEncoder.matches("secret123", entityToSave.getPassword()));
    }

    @Test
    @DisplayName("Should authenticate valid BCrypt password and reject invalid password")
    void testAuthenticate() {
        String rawPassword = "correctPassword123";
        String hashedPassword = passwordEncoder.encode(rawPassword);

        UserEntity entity = new UserEntity("user@test.com", "Jane Doe", hashedPassword);
        entity.setId(201L);

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(entity));

        // Valid password
        Optional<User> success = userService.authenticate("user@test.com", rawPassword);
        assertTrue(success.isPresent());
        assertEquals("Jane Doe", success.get().getFullName());
        assertNull(success.get().getPassword());

        // Invalid password
        Optional<User> failure = userService.authenticate("user@test.com", "wrongPassword");
        assertTrue(failure.isEmpty());
    }

    @Test
    @DisplayName("Should seamlessly upgrade legacy plaintext password to BCrypt upon successful login")
    void testLegacyPlaintextPasswordUpgrade() {
        String legacyPlaintext = "oldPlaintext123";
        UserEntity legacyEntity = new UserEntity("legacy@test.com", "Legacy User", legacyPlaintext);
        legacyEntity.setId(301L);

        when(userRepository.findByEmail("legacy@test.com")).thenReturn(Optional.of(legacyEntity));

        Optional<User> authResult = userService.authenticate("legacy@test.com", legacyPlaintext);

        assertTrue(authResult.isPresent());
        verify(userRepository, atLeastOnce()).save(legacyEntity);
        assertTrue(legacyEntity.getPassword().startsWith("$2a$") || legacyEntity.getPassword().startsWith("$2b$"),
                "Password must have been upgraded to BCrypt");
        assertTrue(passwordEncoder.matches(legacyPlaintext, legacyEntity.getPassword()));
    }
}
