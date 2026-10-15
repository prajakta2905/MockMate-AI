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
 * Enterprise GroqCloud Ultra-Low Latency Inference Service.
 * Manages secret API keys entirely on the backend to prevent client-side credential exposure.
 */
@Service
public class GroqService {
    private static final Logger log = LoggerFactory.getLogger(GroqService.class);
    private static final String GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

    @Value("${mockmate.ai.groq-api-key:}")
    private String groqApiKey;

    @Value("${mockmate.ai.groq-model:qwen/qwen3.8-27b}")
    private String model;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public GroqService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return groqApiKey != null && groqApiKey.startsWith("gsk_");
    }

    public void setApiKey(String key) {
        this.groqApiKey = key;
    }

    public String getApiKey() {
        return groqApiKey;
    }

    public String getModel() {
        return model;
    }

    public String callGroq(String systemInstruction, String userMessage) {
        return callGroq(systemInstruction, userMessage, false, null, null, null);
    }

    /**
     * Enhanced overload supporting JSON mode, custom temperature, model override, and optional client key override.
     */
    public String callGroq(String systemInstruction, String userMessage, boolean jsonMode, Double temperature, String modelOverride, String customApiKey) {
        String effectiveKey = (customApiKey != null && customApiKey.startsWith("gsk_")) ? customApiKey : this.groqApiKey;
        if (effectiveKey == null || !effectiveKey.startsWith("gsk_")) {
            return null;
        }

        String targetModel = (modelOverride != null && !modelOverride.isBlank()) ? modelOverride : this.model;
        String result = executeGroqRequest(targetModel, systemInstruction, userMessage, jsonMode, temperature, effectiveKey);
        if (result == null && !targetModel.equals("openai/gpt-oss-20b")) {
            log.info("Attempting fallback Groq model openai/gpt-oss-20b");
            result = executeGroqRequest("openai/gpt-oss-20b", systemInstruction, userMessage, jsonMode, temperature, effectiveKey);
        }
        return result;
    }

    private String executeGroqRequest(String targetModel, String systemInstruction, String userMessage, boolean jsonMode, Double temperature, String apiKey) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("model", targetModel);
            payload.put("messages", List.of(
                    Map.of("role", "system", "content", systemInstruction != null ? systemInstruction : ""),
                    Map.of("role", "user", "content", userMessage != null ? userMessage : "")
            ));
            payload.put("temperature", temperature != null ? temperature : 0.4);

            if (jsonMode) {
                payload.put("response_format", Map.of("type", "json_object"));
            }

            String requestBody = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GROQ_ENDPOINT))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey.trim())
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode choice = root.path("choices").path(0).path("message").path("content");
                return choice.asText();
            } else {
                log.warn("Groq API returned HTTP {}: {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.error("Failed to invoke Groq API ({}): {}", targetModel, e.getMessage());
        }
        return null;
    }

    /**
     * Evaluates answer and crafts an intelligent follow-up question
     */
    public String generateFollowUp(String question, String candidateAnswer, String targetRole) {
        String system = "You are an elite Tech Interview Lead at Google/Meta interviewing for the position of " + targetRole + ".\n"
                + "Evaluate the candidate's response. If the answer is surface-level, ask a razor-sharp follow-up exploring trade-offs, edge cases, or internal mechanics.\n"
                + "CRITICAL CONSTRAINT: Your follow-up question MUST be strictly between 15 and 18 words in length.\n"
                + "Keep your response conversational, concise, and encouraging yet rigorous.";

        String user = "Interview Question: " + question + "\nCandidate Answer: " + candidateAnswer + "\nProvide feedback and ask your follow-up:";
        return callGroq(system, user);
    }
}
