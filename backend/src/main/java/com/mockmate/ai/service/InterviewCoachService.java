package com.mockmate.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockmate.ai.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class InterviewCoachService {
    private static final Logger log = LoggerFactory.getLogger(InterviewCoachService.class);

    private final GroqService groqService;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    public InterviewCoachService(GroqService groqService, GeminiService geminiService, ObjectMapper objectMapper) {
        this.groqService = groqService;
        this.geminiService = geminiService;
        this.objectMapper = objectMapper;
    }

    /**
     * Generates a tailored 5-question pool based on the candidate's resume and target role.
     */
    public QuestionPool generateQuestionPool(CandidateProfile profile) {
        QuestionPool pool = new QuestionPool();
        String role = profile.getTargetRole();
        List<String> skills = profile.getExtractedSkills();
        String skillsStr = String.join(", ", skills);

        // Attempt AI generation if Groq or Gemini is available
        if (groqService.isConfigured() || geminiService.isConfigured()) {
            try {
                String prompt = buildQuestionPoolPrompt(profile.getFullName(), role, skillsStr);
                String rawResponse = null;

                if (groqService.isConfigured()) {
                    rawResponse = groqService.callGroq("You are a principal technical interviewer. Return JSON only.", prompt);
                } else if (geminiService.isConfigured()) {
                    rawResponse = geminiService.callGemini(prompt);
                }

                if (rawResponse != null) {
                    QuestionPool parsed = parseQuestionPoolJson(rawResponse);
                    if (parsed != null && parsed.getWarmupQuestion() != null) {
                        return parsed;
                    }
                }
            } catch (Exception e) {
                log.warn("AI question pool generation failed, falling back to local questions: {}", e.getMessage());
            }
        }

        // Fallback to local questions if external AI is unavailable
        return getCuratedLocalPool(profile);
    }

    private String buildQuestionPoolPrompt(String name, String role, String skills) {
        return "Generate a structured interview for " + name + " applying for " + role + ".\n"
                + "Skills listed: " + skills + "\n"
                + "Return JSON with format:\n"
                + "{\n"
                + "  \"warmup\": \"Tell me about yourself and your background with " + role + "\",\n"
                + "  \"technical\": [\"question 1\", \"question 2\", \"question 3\"],\n"
                + "  \"behavioral\": [\"question 4\"]\n"
                + "}";
    }

    private QuestionPool parseQuestionPoolJson(String json) {
        try {
            // Clean markdown blocks if present
            String clean = json.replaceAll("```json", "").replaceAll("```", "").trim();
            JsonNode root = objectMapper.readTree(clean);

            QuestionPool pool = new QuestionPool();
            String warmup = root.path("warmup").asText();
            pool.setWarmupQuestion(new InterviewQuestion("q-0", "WARMUP", warmup, "Keep introduction clear and under 2 minutes"));

            List<InterviewQuestion> techList = new ArrayList<>();
            JsonNode techArray = root.path("technical");
            int idx = 1;
            for (JsonNode node : techArray) {
                techList.add(new InterviewQuestion("q-" + idx, "TECHNICAL", node.asText(), "Focus on architecture, efficiency & trade-offs"));
                idx++;
            }
            pool.setTechnicalQuestions(techList);

            List<InterviewQuestion> behList = new ArrayList<>();
            JsonNode behArray = root.path("behavioral");
            for (JsonNode node : behArray) {
                behList.add(new InterviewQuestion("q-" + idx, "BEHAVIORAL", node.asText(), "Use STAR method (Situation, Task, Action, Result)"));
                idx++;
            }
            pool.setBehavioralQuestions(behList);

            return pool;
        } catch (Exception e) {
            log.warn("Failed to parse JSON question pool: {}", e.getMessage());
            return null;
        }
    }

    private QuestionPool getCuratedLocalPool(CandidateProfile profile) {
        QuestionPool pool = new QuestionPool();
        String role = profile.getTargetRole();

        pool.setWarmupQuestion(new InterviewQuestion(
                "q-warmup",
                "WARMUP",
                "Hello " + profile.getFullName() + "! Welcome to your interview. Can you walk me through your background and the core technical stack you've worked with?",
                "Highlight key projects, preferred programming languages, and recent achievements."
        ));

        List<InterviewQuestion> techList = new ArrayList<>();
        if (role.toLowerCase().contains("java") || role.toLowerCase().contains("backend")) {
            techList.add(new InterviewQuestion(
                    "q-tech-1",
                    "TECHNICAL",
                    "Can you explain the internal working of Java Memory Model (Heap vs Stack, Garbage Collection algorithms like G1 / ZGC)?",
                    "Discuss object allocation, generational hypothesis, and memory leak mitigation."
            ));
            techList.add(new InterviewQuestion(
                    "q-tech-2",
                    "TECHNICAL",
                    "How do you design a high-throughput RESTful service in Spring Boot that handles database contention and spikes under heavy load?",
                    "Touch upon connection pooling (HikariCP), caching with Redis, and asynchronous processing."
            ));
            techList.add(new InterviewQuestion(
                    "q-tech-3",
                    "TECHNICAL",
                    "Explain the difference between Optimistic and Pessimistic locking in database transactions, and how you implement it in Hibernate/JPA.",
                    "Mention @Version annotation, lock modes, and trade-offs in high concurrency."
            ));
        } else {
            techList.add(new InterviewQuestion(
                    "q-tech-1",
                    "TECHNICAL",
                    "How does client-server communication differ when using WebSockets versus standard HTTP/2 REST polling?",
                    "Discuss latency, connection handshakes, and duplex data streams."
            ));
            techList.add(new InterviewQuestion(
                    "q-tech-2",
                    "TECHNICAL",
                    "Walk me through how you optimize page load performance and Core Web Vitals (LCP, INP, CLS) in a modern web application.",
                    "Mention bundle chunking, asset caching, lazy loading, and critical CSS."
            ));
            techList.add(new InterviewQuestion(
                    "q-tech-3",
                    "TECHNICAL",
                    "How would you architect a secure user authentication workflow using JWTs and Refresh Tokens?",
                    "Cover token expiration, HttpOnly secure cookies, and rotation strategies."
            ));
        }
        pool.setTechnicalQuestions(techList);

        List<InterviewQuestion> behList = new ArrayList<>();
        behList.add(new InterviewQuestion(
                "q-beh-1",
                "BEHAVIORAL",
                "Describe a situation where a production critical bug appeared right before a release deadline. How did you triage and resolve it?",
                "Structure using STAR methodology: Situation, Task, Action, and measurable Result."
        ));
        pool.setBehavioralQuestions(behList);

        return pool;
    }

    /**
     * Evaluates candidate answers and generates final scorecard.
     */
    public EvaluationReport evaluateSession(InterviewSession session) {
        EvaluationReport report = new EvaluationReport();
        List<InterviewQuestion> answers = session.getConversationHistory();

        int totalScore = 0;
        int count = 0;

        for (InterviewQuestion q : answers) {
            String answer = q.getCandidateAnswer();
            int score = calculateAnswerScore(answer);
            q.setScore(score);
            totalScore += score;
            count++;
        }

        int avg = count > 0 ? (totalScore / count) : 75;
        report.setOverallScore(Math.min(100, Math.max(30, avg)));
        report.setTechnicalAccuracyScore(Math.min(100, (int) (avg * 1.02)));
        report.setCommunicationClarityScore(Math.min(100, (int) (avg * 0.96)));
        report.setProblemSolvingScore(Math.min(100, (int) (avg * 0.98)));
        report.setConfidenceScore(Math.min(100, (int) (avg * 1.05)));

        if (avg >= 85) {
            report.setVerdict("Strong Hire");
        } else if (avg >= 70) {
            report.setVerdict("Hire");
        } else {
            report.setVerdict("Needs Practice");
        }

        report.setExecutiveSummary("Candidate demonstrated solid conceptual clarity in core domain topics with good problem-structuring skills. "
                + "Articulation was direct and relevant to the interview questions asked.");

        report.setTopStrengths(List.of(
                "Strong conceptual grasp of architectural fundamentals",
                "Clear, structured communication with minimal filler phrases",
                "Good awareness of scalability and production edge-cases"
        ));

        report.setAreasOfImprovement(List.of(
                "Provide more concrete quantitative metrics when explaining past project impact",
                "Delve deeper into concurrency, transaction isolation levels, and failover scenarios",
                "Always outline trade-offs before jumping to an immediate technology choice"
        ));

        report.setRecommendedNextSteps(List.of(
                "Practice system design interviews focusing on distributed caching and message brokers",
                "Review high-concurrency Java memory profiling and thread dump diagnostics",
                "Conduct 2 more mock sessions focusing specifically on behavioral STAR responses"
        ));

        return report;
    }

    private int calculateAnswerScore(String answer) {
        if (answer == null || answer.trim().length() < 10) return 40;
        int wordCount = answer.trim().split("\\s+").length;
        if (wordCount < 20) return 60;
        if (wordCount < 50) return 75;
        if (wordCount < 100) return 85;
        return 92;
    }
}
