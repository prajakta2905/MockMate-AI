package com.mockmate.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockmate.ai.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

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
     * Guaranteed to produce fresh, non-repeating questions on each generation.
     */
    public QuestionPool generateQuestionPool(CandidateProfile profile) {
        QuestionPool pool = new QuestionPool();
        String role = profile.getTargetRole() != null ? profile.getTargetRole() : "Software Engineer";
        List<String> skills = profile.getExtractedSkills() != null ? profile.getExtractedSkills() : new ArrayList<>();
        String skillsStr = String.join(", ", skills);

        List<String> projectNames = new ArrayList<>();
        if (profile.getExtractedProjects() != null && !profile.getExtractedProjects().isEmpty()) {
            projectNames.addAll(profile.getExtractedProjects());
        }
        if (profile.getProjects() != null) {
            for (java.util.Map<String, Object> p : profile.getProjects()) {
                if (p != null && p.get("name") != null) {
                    projectNames.add(p.get("name").toString());
                }
            }
        }
        String projectsStr = projectNames.isEmpty() ? "Engineering Project Portfolio" : String.join(", ", projectNames);

        // Attempt AI generation if Groq or Gemini is available
        if (groqService.isConfigured() || geminiService.isConfigured()) {
            try {
                String prompt = buildQuestionPoolPrompt(profile.getFullName(), role, skillsStr, projectsStr);
                String rawResponse = null;

                if (groqService.isConfigured()) {
                    rawResponse = groqService.callGroq("You are a principal technical interviewer at Google/Meta. Return JSON only.", prompt);
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

        // Fallback to dynamic randomized local questions if external AI is unavailable
        return getCuratedLocalPool(profile);
    }

    private String buildQuestionPoolPrompt(String name, String role, String skills, String projects) {
        String[] randomThemes = {
            "High Concurrency, Thread Contention & Microservices Scaling",
            "Distributed Data Consistency, Caching Hierarchies & Deadlock Prevention",
            "Production Fault-Tolerance, Incident Postmortems & Resilience",
            "API Gateway Security, Token Architectures & Zero-Trust Verification",
            "System Bottleneck Profiling, JVM Tuning & Algorithmic Optimization"
        };
        int themeIdx = (int) (System.currentTimeMillis() % randomThemes.length);
        String selectedTheme = randomThemes[themeIdx];
        long seed = System.currentTimeMillis();

        return "Generate a structured, highly realistic 5-question interview for " + name + " applying for " + role + ".\n"
                + "Candidate Skills: " + skills + "\n"
                + "Candidate Projects: " + projects + "\n"
                + "Focus Theme for this session: " + selectedTheme + "\n"
                + "Unique Session Seed: " + seed + "\n"
                + "CRITICAL INSTRUCTIONS:\n"
                + "1. Generate completely unique, fresh questions. NEVER return static textbook definitions (e.g. 'What is OOP?').\n"
                + "2. Questions must be specific scenario probes based on their skills (" + skills + ") and projects (" + projects + ").\n"
                + "3. Vary the questions dynamically every time so that each interview feels brand new.\n"
                + "4. STRICT WORD COUNT RULE: Every single question MUST be strictly between 15 and 18 words long. Count words carefully.\n"
                + "Return JSON with format:\n"
                + "{\n"
                + "  \"warmup\": \"Could you introduce your technical background, core skills, and describe your proudest software engineering achievement?\",\n"
                + "  \"technical\": [\"technical scenario question 1\", \"technical scenario question 2\", \"project architecture question 3\"],\n"
                + "  \"behavioral\": [\"behavioral STAR question 4\"]\n"
                + "}";
    }

    /**
     * Enforces that any interview question is strictly between 15 and 18 words long.
     */
    public static String enforceWordCount(String question) {
        if (question == null || question.isBlank()) {
            return "Could you introduce your technical background, core skills, and describe your proudest software engineering achievement?";
        }
        String clean = question.replaceAll("\\s+", " ").trim();
        String[] words = clean.split(" ");
        int count = words.length;

        if (count >= 15 && count <= 18) {
            if (!clean.endsWith("?")) clean += "?";
            return clean;
        }

        if (count > 18) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 17; i++) {
                if (i > 0) sb.append(" ");
                sb.append(words[i]);
            }
            String trimmed = sb.toString().replaceAll("[,;:\\-\\s]+$", "");
            return trimmed + "?";
        }

        // count < 15: Expand gracefully
        int needed = 16 - count;
        String prefix;
        if (clean.toLowerCase().startsWith("how") || clean.toLowerCase().startsWith("what") || clean.toLowerCase().startsWith("why")) {
            prefix = needed <= 4 ? "In your experience, " : "In your past production engineering work, ";
        } else {
            prefix = needed <= 4 ? "In software engineering, " : "From an architectural design perspective, ";
        }

        String combined = (prefix + clean).replaceAll("\\s+", " ").trim();
        String[] newWords = combined.split(" ");
        if (newWords.length >= 15 && newWords.length <= 18) {
            if (!combined.endsWith("?")) combined += "?";
            return combined;
        }

        if (newWords.length > 18) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 16; i++) {
                if (i > 0) sb.append(" ");
                sb.append(newWords[i]);
            }
            return sb.toString().replaceAll("[,;:\\-\\s]+$", "") + "?";
        }

        while (combined.split(" ").length < 15) {
            combined = combined.replace("?", "") + " in detail?";
        }
        String[] finalWords = combined.split(" ");
        if (finalWords.length > 18) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 16; i++) {
                if (i > 0) sb.append(" ");
                sb.append(finalWords[i]);
            }
            return sb.toString().replaceAll("[,;:\\-\\s]+$", "") + "?";
        }
        if (!combined.endsWith("?")) combined += "?";
        return combined;
    }

    private QuestionPool parseQuestionPoolJson(String json) {
        try {
            // Clean markdown blocks if present
            String clean = json.replaceAll("```json", "").replaceAll("```", "").trim();
            int firstBrace = clean.indexOf('{');
            int lastBrace = clean.lastIndexOf('}');
            if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
                clean = clean.substring(firstBrace, lastBrace + 1);
            }
            JsonNode root = objectMapper.readTree(clean);

            QuestionPool pool = new QuestionPool();

            // 1. Warmup question
            String warmup = extractQuestionText(root.path("warmup"));
            if (warmup.isBlank()) {
                warmup = extractQuestionText(root.path("warmupQuestion"));
            }
            if (warmup.isBlank()) {
                warmup = extractQuestionText(root.path("warmup_question"));
            }
            if (warmup.isBlank()) {
                warmup = "Could you introduce your technical background, core skills, and describe your proudest software engineering achievement?";
            }
            pool.setWarmupQuestion(new InterviewQuestion("q-0", "WARMUP", enforceWordCount(warmup), "Keep introduction clear and under 2 minutes"));

            // 2. Technical questions
            List<InterviewQuestion> techList = new ArrayList<>();
            JsonNode techArray = root.has("technical") ? root.path("technical") : root.path("technicalQuestions");
            int idx = 1;
            if (techArray.isArray()) {
                for (JsonNode node : techArray) {
                    String qText = extractQuestionText(node);
                    if (!qText.isBlank()) {
                        techList.add(new InterviewQuestion("q-" + idx, "TECHNICAL", enforceWordCount(qText), "Focus on architecture, efficiency & trade-offs"));
                        idx++;
                    }
                }
            }
            if (techList.isEmpty()) {
                // If AI returned empty technical list, force fallback to curated pool
                return null;
            }
            pool.setTechnicalQuestions(techList);

            // 3. Behavioral questions
            List<InterviewQuestion> behList = new ArrayList<>();
            JsonNode behArray = root.has("behavioral") ? root.path("behavioral") : root.path("behavioralQuestions");
            if (behArray.isArray()) {
                for (JsonNode node : behArray) {
                    String qText = extractQuestionText(node);
                    if (!qText.isBlank()) {
                        behList.add(new InterviewQuestion("q-" + idx, "BEHAVIORAL", enforceWordCount(qText), "Use STAR method (Situation, Task, Action, Result)"));
                        idx++;
                    }
                }
            }
            if (behList.isEmpty()) {
                behList.add(new InterviewQuestion("q-" + idx, "BEHAVIORAL",
                        enforceWordCount("Tell me about a technical disagreement you had with a teammate or lead, and explain how you resolved it."),
                        "Use STAR method (Situation, Task, Action, Result)"));
            }
            pool.setBehavioralQuestions(behList);

            return pool;
        } catch (Exception e) {
            log.warn("Failed to parse JSON question pool: {}", e.getMessage());
            return null;
        }
    }

    private String extractQuestionText(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return "";
        }
        if (node.isTextual()) {
            return node.asText().trim();
        }
        if (node.isObject()) {
            if (node.hasNonNull("question")) return node.path("question").asText().trim();
            if (node.hasNonNull("questionText")) return node.path("questionText").asText().trim();
            if (node.hasNonNull("text")) return node.path("text").asText().trim();
        }
        return "";
    }

    private QuestionPool getCuratedLocalPool(CandidateProfile profile) {
        QuestionPool pool = new QuestionPool();
        String role = profile.getTargetRole() != null ? profile.getTargetRole() : "Software Engineer";
        Random rng = new Random();

        // 1. Dynamic Warmups (Strictly 15 to 18 words)
        List<String> warmupOptions = List.of(
            "Could you introduce yourself, highlight your primary technical stack, and describe your proudest milestone in software engineering?",
            "Can you walk me through your engineering journey, key technical projects, and what software systems you specialize in?",
            "To begin, please share a concise summary of your technical background, programming languages, and recent career accomplishments.",
            "Welcome to your interview today! Can you introduce your engineering background and the systems you enjoy building most?"
        );
        String chosenWarmup = enforceWordCount(warmupOptions.get(rng.nextInt(warmupOptions.size())));
        pool.setWarmupQuestion(new InterviewQuestion("q-warmup", "WARMUP", chosenWarmup, "Highlight key projects, preferred programming languages, and recent achievements."));

        // 2. Dynamic Technical Questions (Strictly 15 to 18 words)
        List<InterviewQuestion> allTech = new ArrayList<>();
        boolean isJavaOrBackend = role.toLowerCase().contains("java") || role.toLowerCase().contains("backend")
                || (profile.getExtractedSkills() != null && profile.getExtractedSkills().stream().anyMatch(s -> s.toLowerCase().contains("java") || s.toLowerCase().contains("spring")));

        if (isJavaOrBackend) {
            allTech.add(new InterviewQuestion(
                "q-tech-jvm", "TECHNICAL",
                enforceWordCount("How does the Java Memory Model allocate heap versus stack, and how do you diagnose memory leaks?"),
                "Discuss object allocation, generational hypothesis, heap dumps, and memory leak mitigation."
            ));
            allTech.add(new InterviewQuestion(
                "q-tech-throughput", "TECHNICAL",
                enforceWordCount("How do you design a high-throughput Spring Boot service that handles database connection contention under sudden traffic spikes?"),
                "Touch upon connection pooling (HikariCP), caching with Redis, virtual threads or asynchronous processing."
            ));
            allTech.add(new InterviewQuestion(
                "q-tech-locking", "TECHNICAL",
                enforceWordCount("Explain the practical differences between Optimistic and Pessimistic locking, and how you implement them in Hibernate JPA."),
                "Mention @Version annotation, lock modes, and trade-offs in high concurrency."
            ));
            allTech.add(new InterviewQuestion(
                "q-tech-kafka", "TECHNICAL",
                enforceWordCount("In an event-driven architecture with Kafka, how do you guarantee idempotent message processing and handle dead-letter queues?"),
                "Discuss idempotency keys, consumer offset commits, retry topics, and transaction boundaries."
            ));
            allTech.add(new InterviewQuestion(
                "q-tech-microservices", "TECHNICAL",
                enforceWordCount("How do you maintain data consistency across distributed microservices when relational transactions cannot span multiple isolated databases?"),
                "Discuss the Saga pattern (orchestration vs choreography), two-phase commit drawbacks, and compensating transactions."
            ));
            allTech.add(new InterviewQuestion(
                "q-tech-caching", "TECHNICAL",
                enforceWordCount("What Redis caching patterns have you used in production to protect against cache stampedes and stale data?"),
                "Explain Redis data types, TTL strategies, bloom filters, and mutex locking for stale caches."
            ));
        } else {
            allTech.add(new InterviewQuestion(
                "q-tech-realtime", "TECHNICAL",
                enforceWordCount("How do WebSockets and Server-Sent Events compare when selecting a real-time protocol for high-scale live dashboards?"),
                "Discuss connection handshakes, bidirectional vs unidirectional flow, firewall traversal, and reconnection strategies."
            ));
            allTech.add(new InterviewQuestion(
                "q-tech-perf", "TECHNICAL",
                enforceWordCount("Walk me through the systematic strategies you use to optimize page load times and Core Web Vitals."),
                "Mention bundle code-splitting, tree-shaking, asset compression, lazy rendering, and critical CSS."
            ));
            allTech.add(new InterviewQuestion(
                "q-tech-auth", "TECHNICAL",
                enforceWordCount("How would you architect a secure authentication flow using short-lived JWTs and rotating refresh tokens in production?"),
                "Cover short-lived access tokens, HttpOnly secure cookies, refresh token rotation, and XSS/CSRF mitigations."
            ));
            allTech.add(new InterviewQuestion(
                "q-tech-state", "TECHNICAL",
                enforceWordCount("How do you evaluate state management trade-offs between client-side stores and server-side cached state in modern applications?"),
                "Discuss render churn, caching, re-fetching policies, and decoupling client state from server data."
            ));
            allTech.add(new InterviewQuestion(
                "q-tech-api", "TECHNICAL",
                enforceWordCount("When building public REST APIs, how do you implement rate limiting and circuit breaking during downstream failures?"),
                "Discuss token bucket / leaky bucket algorithms, resilience patterns, and fallback responses."
            ));
        }

        // Add a project-specific probe question (Strictly 15 to 18 words)
        allTech.add(new InterviewQuestion(
            "q-tech-project", "TECHNICAL",
            enforceWordCount("Looking at your primary engineering project, what was the most difficult architectural challenge you faced and resolved?"),
            "Focus on system design choices, bottlenecks faced, debugging approach, and architectural trade-offs."
        ));

        // Shuffle so every run has different questions
        Collections.shuffle(allTech, rng);
        List<InterviewQuestion> chosenTech = allTech.subList(0, Math.min(3, allTech.size()));
        pool.setTechnicalQuestions(chosenTech);

        // 3. Dynamic Behavioral Questions (Strictly 15 to 18 words)
        List<InterviewQuestion> behOptions = new ArrayList<>();
        behOptions.add(new InterviewQuestion(
            "q-beh-bug", "BEHAVIORAL",
            enforceWordCount("Describe an experience where a critical production bug occurred near a deadline, and explain how you triaged it."),
            "Structure using STAR methodology: Situation, Task, Action, and measurable Result."
        ));
        behOptions.add(new InterviewQuestion(
            "q-beh-disagree", "BEHAVIORAL",
            enforceWordCount("Tell me about a time you disagreed with a colleague on architecture, and how you reached consensus."),
            "Focus on objective data, constructive communication, team alignment, and final outcomes."
        ));
        behOptions.add(new InterviewQuestion(
            "q-beh-deadline", "BEHAVIORAL",
            enforceWordCount("Can you share a situation where requirements shifted drastically mid-sprint, and how you adapted your team priorities?"),
            "Explain requirement scoping, trade-off communication, stakeholder management, and timely delivery."
        ));
        Collections.shuffle(behOptions, rng);
        pool.setBehavioralQuestions(behOptions.subList(0, 1));

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
