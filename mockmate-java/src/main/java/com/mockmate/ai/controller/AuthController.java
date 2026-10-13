package com.mockmate.ai.controller;

import com.mockmate.ai.model.User;
import com.mockmate.ai.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {
        RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS
})
public class AuthController {
    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signup(@RequestBody Map<String, String> request) {
        String email = request.getOrDefault("email", "");
        String password = request.getOrDefault("password", "");
        String fullName = request.getOrDefault("fullName", request.getOrDefault("name", "Candidate"));

        if (email.isBlank() || password.length() < 6) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", "Valid email and password (minimum 6 characters) are required.");
            return ResponseEntity.badRequest().body(err);
        }

        try {
            User user = userService.registerUser(email, fullName, password);
            String token = userService.createTokenForUser(user);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("token", token);
            response.put("user", formatUser(user));
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> request) {
        String email = request.getOrDefault("email", "");
        String password = request.getOrDefault("password", "");

        Optional<User> userOpt = userService.authenticate(email, password);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String token = userService.createTokenForUser(user);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("token", token);
            response.put("user", formatUser(user));
            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", "Invalid email or password. Please verify and try again.");
            return ResponseEntity.status(401).body(err);
        }
    }

    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Optional<User> userOpt = userService.getUserByToken(authHeader);
        if (userOpt.isPresent()) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("user", formatUser(userOpt.get()));
            return ResponseEntity.ok(response);
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("user", null);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        userService.invalidateToken(authHeader);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> request) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("message", "If that account exists, a password reset link has been dispatched.");
        return ResponseEntity.ok(res);
    }

    private Map<String, Object> formatUser(User user) {
        Map<String, Object> u = new LinkedHashMap<>();
        u.put("id", user.getId());
        u.put("email", user.getEmail());
        u.put("name", user.getFullName());
        u.put("createdAt", user.getCreatedAt().toString());
        return u;
    }
}
