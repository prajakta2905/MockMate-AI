package com.mockmate.ai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockmate.ai.entity.InterviewRecordEntity;
import com.mockmate.ai.entity.ResumeEntity;
import com.mockmate.ai.model.*;
import com.mockmate.ai.repository.InterviewRecordRepository;
import com.mockmate.ai.repository.ResumeRepository;
import com.mockmate.ai.service.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {
        RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS
})
public class InterviewApiController {
    private static final Logger log = LoggerFactory.getLogger(InterviewApiController.class);

    private final PdfResumeParserService pdfParserService;
    private final InterviewCoachService coachService;
    private final GroqService groqService;
    private final GeminiService geminiService;
    private final InterviewSessionStore sessionStore;
    private final ResumeRepository resumeRepository;
    private final InterviewRecordRepository interviewRecordRepository;
    private final ObjectMapper objectMapper;

    public InterviewApiController(PdfResumeParserService pdfParserService,
                                  InterviewCoachService coachService,
                                  GroqService groqService,
                                  GeminiService geminiService,
                                  InterviewSessionStore sessionStore,
                                  ResumeRepository resumeRepository,
                                  InterviewRecordRepository interviewRecordRepository,
                                  ObjectMapper objectMapper) {
        this.pdfParserService = pdfParserService;
        this.coachService = coachService;
        this.groqService = groqService;
        this.geminiService = geminiService;
        this.sessionStore = sessionStore;
        this.resumeRepository = resumeRepository;
        this.interviewRecordRepository = interviewRecordRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Backend health and AI service readiness check
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("status", "UP");
        status.put("service", "MockMate AI Spring Boot Backend");
        status.put("version", "1.0.0");
        status.put("jpaConnected", true);
        status.put("totalResumesSaved", resumeRepository.count());
        status.put("totalInterviewsSaved", interviewRecordRepository.count());
        status.put("groqConfigured", groqService.isConfigured());
        status.put("geminiConfigured", geminiService.isConfigured());
        status.put("groqModel", groqService.getModel());
        status.put("geminiModel", geminiService.getModel());
        return ResponseEntity.ok(status);
    }

    /**
     * Upload & parse resume PDF using Apache PDFBox + Persist to Spring Data JPA
     */
    @PostMapping(value = "/resume/parse", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CandidateProfile> parseResumePdf(@RequestParam("file") MultipartFile file,
                                                           @RequestParam(value = "sessionId", required = false) String sessionId,
                                                           @RequestParam(value = "userId", required = false) String userId) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            CandidateProfile profile = pdfParserService.parseResumePdf(file.getInputStream());
            InterviewSession session = sessionStore.getSession(sessionId);
            session.setProfile(profile);

            // Persist to database via Spring Data JPA
            try {
                String skillsStr = String.join(", ", profile.getExtractedSkills());
                ResumeEntity resumeEntity = new ResumeEntity(
                        userId,
                        profile.getFullName(),
                        profile.getTargetRole(),
                        profile.getEmail(),
                        profile.getPhone(),
                        skillsStr,
                        profile.getRawResumeText()
                );
                resumeRepository.save(resumeEntity);
            } catch (Exception dbEx) {
                log.warn("Could not persist resume to database: {}", dbEx.getMessage());
            }

            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            log.error("Failed to parse resume PDF", e);
            CandidateProfile fallback = new CandidateProfile("Candidate", "Software Engineer");
            return ResponseEntity.ok(fallback);
        }
    }

    /**
     * Parse resume from raw text or JSON payload + Persist to Spring Data JPA
     */
    @PostMapping(value = "/resume/parse-text", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CandidateProfile> parseResumeText(@RequestBody Map<String, String> payload,
                                                            @RequestParam(value = "sessionId", required = false) String sessionId,
                                                            @RequestParam(value = "userId", required = false) String userId) {
        String text = payload.getOrDefault("rawText", "");
        CandidateProfile profile = pdfParserService.parseResumeText(text);
        InterviewSession session = sessionStore.getSession(sessionId);
        session.setProfile(profile);

        // Persist to database via Spring Data JPA
        try {
            String skillsStr = String.join(", ", profile.getExtractedSkills());
            ResumeEntity resumeEntity = new ResumeEntity(
                    userId,
                    profile.getFullName(),
                    profile.getTargetRole(),
                    profile.getEmail(),
                    profile.getPhone(),
                    skillsStr,
                    text
            );
            resumeRepository.save(resumeEntity);
        } catch (Exception dbEx) {
            log.warn("Could not persist text resume to database: {}", dbEx.getMessage());
        }

        return ResponseEntity.ok(profile);
    }

    /**
     * Generate structured interview question pool
     */
    @PostMapping("/interview/questions")
    public ResponseEntity<QuestionPool> generateQuestions(@RequestBody(required = false) Map<String, Object> request,
                                                          @RequestParam(value = "sessionId", required = false) String sessionId) {
        InterviewSession session = sessionStore.getSession(sessionId);
        CandidateProfile profile = session.getProfile();

        if (request != null) {
            if (request.containsKey("role") && request.get("role") != null) {
                profile.setTargetRole(request.get("role").toString());
            }
            if (request.containsKey("fullName") && request.get("fullName") != null) {
                profile.setFullName(request.get("fullName").toString());
            }
            if (request.containsKey("skills") && request.get("skills") instanceof List) {
                @SuppressWarnings("unchecked")
                List<String> skills = (List<String>) request.get("skills");
                profile.setExtractedSkills(skills);
            }
        }

        QuestionPool pool = coachService.generateQuestionPool(profile);
        session.setQuestionPool(pool);
        return ResponseEntity.ok(pool);
    }

    /**
     * Evaluates a single answer and generates a dynamic follow-up
     */
    @PostMapping("/interview/evaluate-answer")
    public ResponseEntity<Map<String, Object>> evaluateAnswer(@RequestBody Map<String, String> payload) {
        String question = payload.getOrDefault("question", payload.getOrDefault("questionText", payload.getOrDefault("text", "")));
        String answer = payload.getOrDefault("answer", payload.getOrDefault("candidateAnswer", ""));
        String role = payload.getOrDefault("role", "Software Engineer");

        Map<String, Object> result = new LinkedHashMap<>();

        // Calculate heuristic score
        int wordCount = answer.trim().isEmpty() ? 0 : answer.trim().split("\\s+").length;
        int score = wordCount < 15 ? 50 : (wordCount < 40 ? 70 : (wordCount < 80 ? 85 : 92));
        result.put("score", score);

        // Generate follow-up question if AI service is configured
        String followUp = null;
        if (groqService.isConfigured()) {
            followUp = groqService.generateFollowUp(question, answer, role);
        } else if (geminiService.isConfigured()) {
            String prompt = "You are a tech interviewer for role: " + role + ". Candidate was asked: '" + question + "'. "
                    + "Candidate answered: '" + answer + "'. Give a 1-sentence critique and 1 sharp follow-up question.";
            followUp = geminiService.callGemini(prompt);
        }

        if (followUp == null || followUp.isBlank()) {
            followUp = InterviewCoachService.enforceWordCount("Could you elaborate on the performance implications and key trade-offs of this architectural approach in production?");
        } else {
            followUp = InterviewCoachService.enforceWordCount(followUp);
        }

        result.put("feedback", followUp);
        result.put("nextFollowUp", followUp);
        result.put("nextQuestion", followUp);
        result.put("action", "next");
        result.put("isFollowUp", true);
        result.put("rationale", "Probing deeper into technical rationale and system trade-offs");
        return ResponseEntity.ok(result);
    }

    /**
     * Holistic final interview report card + Persist to Spring Data JPA
     */
    @PostMapping("/interview/report")
    public ResponseEntity<EvaluationReport> generateReport(@RequestBody(required = false) Map<String, Object> body,
                                                           @RequestParam(value = "sessionId", required = false) String sessionId,
                                                           @RequestParam(value = "userId", required = false) String userId) {
        InterviewSession session = sessionStore.getSession(sessionId);

        // If body contains questions & answers, load into session
        if (body != null && body.containsKey("answers") && body.get("answers") instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rawList = (List<Map<String, Object>>) body.get("answers");
            List<InterviewQuestion> qList = new ArrayList<>();
            for (Map<String, Object> item : rawList) {
                String qText = Objects.toString(item.get("question"), "");
                String aText = Objects.toString(item.get("answer"), "");
                InterviewQuestion q = new InterviewQuestion(
                        UUID.randomUUID().toString(),
                        Objects.toString(item.get("category"), "TECHNICAL"),
                        qText,
                        ""
                );
                q.setCandidateAnswer(aText);
                qList.add(q);
            }
            session.setConversationHistory(qList);
        }

        EvaluationReport report = coachService.evaluateSession(session);
        session.setFinalReport(report);

        // Persist completed interview to database via Spring Data JPA
        try {
            String reportJson = objectMapper.writeValueAsString(report);
            InterviewRecordEntity record = new InterviewRecordEntity(
                    sessionId != null ? sessionId : UUID.randomUUID().toString(),
                    userId,
                    session.getProfile().getFullName(),
                    session.getProfile().getTargetRole(),
                    report.getOverallScore(),
                    report.getVerdict(),
                    15,
                    session.getConversationHistory().size(),
                    reportJson
            );
            interviewRecordRepository.save(record);
        } catch (Exception e) {
            log.warn("Could not persist interview record to database: {}", e.getMessage());
        }

        return ResponseEntity.ok(report);
    }



    /**
     * Fetch saved resumes from Spring Data JPA
     */
    @GetMapping("/resumes")
    public ResponseEntity<List<ResumeEntity>> getResumes(@RequestParam(value = "userId", required = false) String userId) {
        if (userId != null && !userId.isBlank()) {
            return ResponseEntity.ok(resumeRepository.findByUserId(userId));
        }
        return ResponseEntity.ok(resumeRepository.findAllByOrderByCreatedAtDesc());
    }
}
