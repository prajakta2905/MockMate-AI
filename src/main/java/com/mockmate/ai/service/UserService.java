package com.mockmate.ai.service;

import com.mockmate.ai.entity.UserEntity;
import com.mockmate.ai.model.User;
import com.mockmate.ai.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Enterprise User Authentication & Session Service.
 * Implements salted BCrypt password hashing, constant-time verification,
 * and automatic legacy plaintext migration.
 */
@Service
public class UserService {
    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    // Standard BCrypt hash pattern check ($2a$, $2b$, or $2y$)
    private static final Pattern BCRYPT_PATTERN = Pattern.compile("^\\$2[aby]?\\$\\d{2}\\$[./A-Za-z0-9]{53}$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Map<String, String> tokenToUserId = new ConcurrentHashMap<>();

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        seedDefaultUser();
    }

    /**
     * Seeds initial demo user account with a secure BCrypt hash.
     * Never stores raw plaintext credentials in the database.
     */
    private void seedDefaultUser() {
        Optional<UserEntity> demoOpt = userRepository.findByEmail("demo@mockmate.ai");
        if (demoOpt.isEmpty()) {
            String hashedDemoPassword = passwordEncoder.encode("password123");
            userRepository.save(new UserEntity("demo@mockmate.ai", "Demo Candidate", hashedDemoPassword));
            log.info("Initialized demo user (demo@mockmate.ai) with BCrypt-hashed password.");
        } else {
            UserEntity existing = demoOpt.get();
            // Seamless migration: If existing demo user had plaintext password, upgrade to BCrypt
            if (!isBCryptHashed(existing.getPassword())) {
                existing.setPassword(passwordEncoder.encode(existing.getPassword()));
                userRepository.save(existing);
                log.info("Upgraded existing demo user credentials to BCrypt hash.");
            }
        }
    }

    /**
     * Registers a new user with BCrypt password hashing.
     */
    @Transactional
    public User registerUser(String email, String fullName, String rawPassword) {
        String cleanEmail = email.trim().toLowerCase();
        if (userRepository.existsByEmail(cleanEmail)) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }

        if (rawPassword == null || rawPassword.trim().length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters.");
        }

        // Salt and hash the password with BCrypt
        String hashedPassword = passwordEncoder.encode(rawPassword.trim());
        UserEntity entity = new UserEntity(cleanEmail, fullName.trim(), hashedPassword);
        UserEntity saved = userRepository.save(entity);

        // Security best practice: Never return password or hash in the User DTO
        return new User(String.valueOf(saved.getId()), saved.getEmail(), saved.getFullName(), null);
    }

    /**
     * Authenticates candidate credentials using constant-time BCrypt matching.
     * Includes automatic upgrade for any legacy plaintext accounts.
     */
    @Transactional
    public Optional<User> authenticate(String email, String rawPassword) {
        if (email == null || rawPassword == null) {
            return Optional.empty();
        }

        String cleanEmail = email.trim().toLowerCase();
        Optional<UserEntity> entityOpt = userRepository.findByEmail(cleanEmail);

        if (entityOpt.isPresent()) {
            UserEntity u = entityOpt.get();
            String storedPassword = u.getPassword();
            boolean matches = false;

            if (isBCryptHashed(storedPassword)) {
                matches = passwordEncoder.matches(rawPassword, storedPassword);
            } else {
                // Graceful legacy migration: Verify plaintext equality and immediately upgrade to BCrypt
                if (storedPassword.equals(rawPassword)) {
                    matches = true;
                    u.setPassword(passwordEncoder.encode(rawPassword));
                    userRepository.save(u);
                    log.info("Seamlessly upgraded plaintext password for user {} to BCrypt.", cleanEmail);
                }
            }

            if (matches) {
                return Optional.of(new User(String.valueOf(u.getId()), u.getEmail(), u.getFullName(), null));
            }
        }
        return Optional.empty();
    }

    private boolean isBCryptHashed(String password) {
        if (password == null) return false;
        return BCRYPT_PATTERN.matcher(password).matches();
    }

    public String createTokenForUser(User user) {
        String token = "mockmate_jwt_" + UUID.randomUUID().toString().replace("-", "");
        tokenToUserId.put(token, user.getId());
        return token;
    }

    public void invalidateToken(String token) {
        if (token != null && !token.isBlank()) {
            String cleanToken = token.replace("Bearer ", "").trim();
            tokenToUserId.remove(cleanToken);
        }
    }

    public Optional<User> getUserByToken(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        String cleanToken = token.replace("Bearer ", "").trim();
        String userIdStr = tokenToUserId.get(cleanToken);
        if (userIdStr != null) {
            try {
                Long id = Long.parseLong(userIdStr);
                return userRepository.findById(id).map(u -> new User(String.valueOf(u.getId()), u.getEmail(), u.getFullName(), null));
            } catch (NumberFormatException e) {
                return Optional.empty();
            }
        }
        return Optional.empty();
    }
}
