package com.mockmate.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {
    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);
    private static final String GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

    @Value("${mockmate.ai.gemini-api-key:}")
    private String geminiApiKey;

    @Value("${mockmate.ai.gemini-model:gemini-2.0-flash}")
    private String model;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public GeminiService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return geminiApiKey != null && !geminiApiKey.isBlank();
    }

    public void setApiKey(String key) {
        this.geminiApiKey = key;
    }

    public String getApiKey() {
        return geminiApiKey;
    }

    public String getModel() {
        return model;
    }

    public String callGemini(String prompt) {
        if (!isConfigured()) {
            return null;
        }

        try {
            String url = GEMINI_API_BASE + model + ":generateContent?key=" + geminiApiKey.trim();

            Map<String, Object> contentPart = Map.of("text", prompt);
            Map<String, Object> content = Map.of("parts", List.of(contentPart));
            Map<String, Object> body = Map.of("contents", List.of(content));

            String jsonPayload = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode candidate = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
                return candidate.asText();
            } else {
                log.warn("Gemini API error HTTP {}: {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.error("Gemini call failed: {}", e.getMessage());
        }
        return null;
    }
}
