package com.mockmate.ai.controller;

import com.mockmate.ai.model.CandidateProfile;
import com.mockmate.ai.model.PracticeHistoryRecord;
import com.mockmate.ai.model.User;
import com.mockmate.ai.service.HistoryService;
import com.mockmate.ai.service.InterviewSessionStore;
import com.mockmate.ai.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {
        RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS
})
public class HistoryController {
    private final HistoryService historyService;
    private final UserService userService;
    private final InterviewSessionStore sessionStore;

    public HistoryController(HistoryService historyService, UserService userService, InterviewSessionStore sessionStore) {
        this.historyService = historyService;
        this.userService = userService;
        this.sessionStore = sessionStore;
    }

    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getHistory(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Optional<User> userOpt = userService.getUserByToken(authHeader);
        String userId = userOpt.map(User::getId).orElse(null);

        List<PracticeHistoryRecord> records = historyService.getHistoryForUser(userId);
        List<Map<String, Object>> formatted = new ArrayList<>();

        for (PracticeHistoryRecord r : records) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", r.getId());
            map.put("role", r.getRole());
            map.put("overall_score", r.getScore());
            map.put("answer_count", r.getAnswerCount());
            map.put("duration_minutes", r.getDurationMinutes());
            map.put("hiring_decision", r.getHiringDecision());
            map.put("created_at", r.getCompletedAt().toString());
            map.put("report", r.getReportData());
            formatted.add(map);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("history", formatted);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/history")
    public ResponseEntity<Map<String, Object>> saveHistory(@RequestBody Map<String, Object> body,
                                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Optional<User> userOpt = userService.getUserByToken(authHeader);

        PracticeHistoryRecord record = new PracticeHistoryRecord();
        record.setUserId(userOpt.map(User::getId).orElse("guest"));
        record.setRole(Objects.toString(body.get("role"), "Software Engineer"));

        if (body.containsKey("overall_score")) {
            record.setScore(((Number) body.get("overall_score")).intValue());
        } else if (body.containsKey("score")) {
            record.setScore(((Number) body.get("score")).intValue());
        } else {
            record.setScore(75);
        }

        if (body.containsKey("answer_count")) {
            record.setAnswerCount(((Number) body.get("answer_count")).intValue());
        }
        if (body.containsKey("duration_minutes")) {
            record.setDurationMinutes(((Number) body.get("duration_minutes")).intValue());
        }

        record.setHiringDecision(Objects.toString(body.get("hiring_decision"), "Hire"));
        record.setReportData(body.get("report"));

        PracticeHistoryRecord saved = historyService.saveRecord(record);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("id", saved.getId());
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/history/{id}")
    public ResponseEntity<Map<String, Object>> deleteHistory(@PathVariable String id) {
        boolean deleted = historyService.deleteRecord(id);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", deleted);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/resume/save")
    public ResponseEntity<Map<String, Object>> saveResume(@RequestBody CandidateProfile profile,
                                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        sessionStore.setProfile(profile);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("resumeId", UUID.randomUUID().toString());
        return ResponseEntity.ok(res);
    }

    @GetMapping("/resume")
    public ResponseEntity<CandidateProfile> getResume() {
        return ResponseEntity.ok(sessionStore.getProfile());
    }
}
