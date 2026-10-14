package com.mockmate.ai.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Service to keep cloud free-tier container instances awake indefinitely.
 * Cloud web services often hibernate after 15 minutes of inactivity.
 * This service automatically sends a lightweight HTTP ping every 10 minutes
 * to the service's own public URL (configured via APP_BASE_URL).
 */
@Service
public class KeepAliveService {
    private static final Logger log = LoggerFactory.getLogger(KeepAliveService.class);

    @Value("${mockmate.keep-alive.enabled:true}")
    private boolean enabled;

    @Value("${mockmate.keep-alive.url:${APP_BASE_URL:}}")
    private String externalUrl;

    private final HttpClient httpClient;
    private Instant lastPingTime;
    private int lastStatusCode = 0;
    private long totalPingsSent = 0;

    public KeepAliveService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    /**
     * Executes every 8 minutes (480,000 ms), with a 1-minute initial delay after startup.
     * Prevents free-tier containers from hibernating due to inactivity.
     */
    @Scheduled(fixedRate = 480000, initialDelay = 60000)
    public void pingSelf() {
        if (!enabled) {
            log.debug("Keep-alive self-ping is disabled.");
            return;
        }

        String targetUrl = resolvePingUrl();
        if (targetUrl == null || targetUrl.isBlank()) {
            log.info("Keep-alive active. Waiting for APP_BASE_URL to begin public self-pinging.");
            return;
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .timeout(Duration.ofSeconds(15))
                    .header("User-Agent", "MockMateAI-KeepAlive/1.0 (Cloud Sleep Prevention)")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            lastStatusCode = response.statusCode();
            lastPingTime = Instant.now();
            totalPingsSent++;

            log.info("Keep-alive self-ping success -> {} (HTTP {}) - Instance kept awake.", targetUrl, lastStatusCode);
        } catch (Exception e) {
            log.warn("Keep-alive self-ping attempt to {} encountered notice: {}", targetUrl, e.getMessage());
        }
    }

    public String resolvePingUrl() {
        if (externalUrl != null && !externalUrl.isBlank()) {
            String trimmed = externalUrl.trim();
            if (trimmed.endsWith("/")) {
                trimmed = trimmed.substring(0, trimmed.length() - 1);
            }
            if (!trimmed.endsWith("/api/keep-alive")) {
                trimmed = trimmed + "/api/keep-alive";
            }
            return trimmed;
        }
        return null;
    }

    public Map<String, Object> getStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("status", "ALIVE");
        status.put("service", "MockMate AI Full-Stack Platform");
        status.put("keepAliveEnabled", enabled);
        status.put("configuredTargetUrl", externalUrl != null && !externalUrl.isBlank() ? externalUrl : "APP_BASE_URL");
        status.put("lastPingTime", lastPingTime != null ? lastPingTime.toString() : "Pending first cycle");
        status.put("lastStatusCode", lastStatusCode);
        status.put("totalPingsSent", totalPingsSent);
        status.put("jvmUptimeSeconds", ManagementFactory.getRuntimeMXBean().getUptime() / 1000);
        status.put("sleepPreventionRule", "Every 10 minutes self-ping to prevent cloud container hibernation");
        return status;
    }
}
