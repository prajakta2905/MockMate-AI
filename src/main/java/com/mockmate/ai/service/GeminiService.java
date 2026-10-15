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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Enterprise Google Gemini Inference Service.
 * Protects Google Gemini API credentials by executing all requests server-side.
 */
@Service
public class GeminiService {
    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);
    private static final String GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

    @Value("${mockmate.ai.gemini-api-key:}")
    private String geminiApiKey;

    @Value("${mockmate.ai.gemini-model:gemini-1.5-flash}")
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
        return callGemini(prompt, null, false, null, null, null);
    }

    public String callGemini(String prompt, String systemInstruction, boolean jsonMode, Double temperature, String modelOverride, String customApiKey) {
        String effectiveKey = (customApiKey != null && !customApiKey.isBlank()) ? customApiKey : this.geminiApiKey;
        if (effectiveKey == null || effectiveKey.isBlank()) {
            return null;
        }

        try {
            String targetModel = (modelOverride != null && !modelOverride.isBlank()) ? modelOverride : this.model;
            String url = GEMINI_API_BASE + targetModel + ":generateContent?key=" + effectiveKey.trim();

            String fullText = (systemInstruction != null && !systemInstruction.isBlank())
                    ? systemInstruction + "\n\n" + prompt
                    : prompt;

            Map<String, Object> contentPart = Map.of("text", fullText);
            Map<String, Object> content = Map.of("parts", List.of(contentPart));

            Map<String, Object> body = new HashMap<>();
            body.put("contents", List.of(content));

            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("temperature", temperature != null ? temperature : 0.85);
            generationConfig.put("topP", 0.95);
            if (jsonMode) {
                generationConfig.put("responseMimeType", "application/json");
            }
            body.put("generationConfig", generationConfig);

            String jsonPayload = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", effectiveKey.trim())
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
