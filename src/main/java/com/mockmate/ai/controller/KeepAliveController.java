package com.mockmate.ai.controller;

import com.mockmate.ai.service.KeepAliveService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller endpoint to prevent Render web service hibernation.
 * Can be pinged by internal KeepAliveService or external monitors (cron-job.org / UptimeRobot).
 */
@RestController
@CrossOrigin(origins = "*")
public class KeepAliveController {

    private final KeepAliveService keepAliveService;

    public KeepAliveController(KeepAliveService keepAliveService) {
        this.keepAliveService = keepAliveService;
    }

    @GetMapping({"/api/keep-alive", "/keep-alive"})
    public ResponseEntity<Map<String, Object>> ping() {
        return ResponseEntity.ok(keepAliveService.getStatus());
    }
}
