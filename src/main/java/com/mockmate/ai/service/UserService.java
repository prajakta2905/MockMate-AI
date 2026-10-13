package com.mockmate.ai.service;

import com.mockmate.ai.entity.UserEntity;
import com.mockmate.ai.model.User;
import com.mockmate.ai.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final Map<String, String> tokenToUserId = new ConcurrentHashMap<>();

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
        seedDefaultUser();
    }

    private void seedDefaultUser() {
        if (!userRepository.existsByEmail("demo@mockmate.ai")) {
            userRepository.save(new UserEntity("demo@mockmate.ai", "Demo Candidate", "password123"));
        }
    }

    @Transactional
    public User registerUser(String email, String fullName, String password) {
        String cleanEmail = email.trim().toLowerCase();
        if (userRepository.existsByEmail(cleanEmail)) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }

        UserEntity entity = new UserEntity(cleanEmail, fullName.trim(), password);
        UserEntity saved = userRepository.save(entity);

        return new User(String.valueOf(saved.getId()), saved.getEmail(), saved.getFullName(), saved.getPassword());
    }

    @Transactional(readOnly = true)
    public Optional<User> authenticate(String email, String password) {
        String cleanEmail = email.trim().toLowerCase();
        Optional<UserEntity> entityOpt = userRepository.findByEmail(cleanEmail);
        if (entityOpt.isPresent() && entityOpt.get().getPassword().equals(password)) {
            UserEntity u = entityOpt.get();
            return Optional.of(new User(String.valueOf(u.getId()), u.getEmail(), u.getFullName(), u.getPassword()));
        }
        return Optional.empty();
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
                return userRepository.findById(id).map(u -> new User(String.valueOf(u.getId()), u.getEmail(), u.getFullName(), u.getPassword()));
            } catch (NumberFormatException e) {
                return Optional.empty();
            }
        }
        return Optional.empty();
    }
}
