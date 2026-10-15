package com.mockmate.ai.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockmate.ai.service.GeminiService;
import com.mockmate.ai.service.GroqService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Secure Server-Side AI Proxy Controller.
 * Eliminates client-side API key exposure. All Groq and Gemini API calls
 * are routed through this backend service using server-managed credentials.
 */
@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {
        RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS
})
public class AiProxyController {
    private static final Logger log = LoggerFactory.getLogger(AiProxyController.class);

    private final GroqService groqService;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    public AiProxyController(GroqService groqService, GeminiService geminiService, ObjectMapper objectMapper) {
        this.groqService = groqService;
        this.geminiService = geminiService;
        this.objectMapper = objectMapper;
    }

    /**
     * Returns AI configuration status without exposing raw secret keys to the browser.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getAiStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("groqConfigured", groqService.isConfigured());
        status.put("geminiConfigured", geminiService.isConfigured());
        status.put("groqModel", groqService.getModel());
        status.put("geminiModel", geminiService.getModel());
        status.put("serverManaged", true);
        return ResponseEntity.ok(status);
    }

    /**
     * Server-side proxy for GroqCloud LLaMA/Qwen chat completions.
     */
    @PostMapping("/groq")
    public ResponseEntity<Map<String, Object>> callGroqProxy(@RequestBody Map<String, Object> request) {
        String prompt = (String) request.getOrDefault("prompt", (String) request.getOrDefault("userMessage", ""));
        String systemInstruction = (String) request.getOrDefault("systemInstruction", (String) request.getOrDefault("system", ""));
        boolean jsonMode = Boolean.TRUE.equals(request.get("jsonMode")) || "json".equalsIgnoreCase(String.valueOf(request.get("format")));
        Double temperature = request.get("temperature") != null ? ((Number) request.get("temperature")).doubleValue() : null;
        String model = (String) request.get("model");
        String customKey = (String) request.get("apiKey");

        Map<String, Object> response = new LinkedHashMap<>();
        try {
            String rawResult = groqService.callGroq(systemInstruction, prompt, jsonMode, temperature, model, customKey);
            if (rawResult != null && !rawResult.isBlank()) {
                response.put("success", true);
                response.put("text", rawResult);

                if (jsonMode) {
                    try {
                        String clean = cleanJson(rawResult);
                        JsonNode jsonNode = objectMapper.readTree(clean);
                        response.put("json", jsonNode);
                    } catch (Exception parseEx) {
                        log.debug("Groq output not strict JSON: {}", parseEx.getMessage());
                    }
                }
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            log.warn("Groq proxy call error: {}", e.getMessage());
            response.put("error", e.getMessage());
        }

        response.put("success", false);
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Server-side proxy for Google Gemini generateContent.
     */
    @PostMapping("/gemini")
    public ResponseEntity<Map<String, Object>> callGeminiProxy(@RequestBody Map<String, Object> request) {
        String prompt = (String) request.getOrDefault("prompt", "");
        String systemInstruction = (String) request.getOrDefault("systemInstruction", "");
        boolean jsonMode = Boolean.TRUE.equals(request.get("jsonMode")) || "json".equalsIgnoreCase(String.valueOf(request.get("format")));
        Double temperature = request.get("temperature") != null ? ((Number) request.get("temperature")).doubleValue() : null;
        String model = (String) request.get("model");
        String customKey = (String) request.get("apiKey");

        Map<String, Object> response = new LinkedHashMap<>();
        try {
            String rawResult = geminiService.callGemini(prompt, systemInstruction, jsonMode, temperature, model, customKey);
            if (rawResult != null && !rawResult.isBlank()) {
                response.put("success", true);
                response.put("text", rawResult);

                if (jsonMode) {
                    try {
                        String clean = cleanJson(rawResult);
                        JsonNode jsonNode = objectMapper.readTree(clean);
                        response.put("json", jsonNode);
                    } catch (Exception parseEx) {
                        log.debug("Gemini output not strict JSON: {}", parseEx.getMessage());
                    }
                }
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            log.warn("Gemini proxy call error: {}", e.getMessage());
            response.put("error", e.getMessage());
        }

        response.put("success", false);
        return ResponseEntity.badRequest().body(response);
    }

    private String cleanJson(String raw) {
        String text = raw.trim();
        if (text.startsWith("```json")) {
            text = text.substring(7);
        } else if (text.startsWith("```")) {
            text = text.substring(3);
        }
        if (text.endsWith("```")) {
            text = text.substring(0, text.length() - 3);
        }
        return text.trim();
    }
}
