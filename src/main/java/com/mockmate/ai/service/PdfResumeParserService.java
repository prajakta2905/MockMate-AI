package com.mockmate.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockmate.ai.model.CandidateProfile;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PdfResumeParserService {
    private static final Logger log = LoggerFactory.getLogger(PdfResumeParserService.class);

    private static final List<String> COMMON_SKILLS = Arrays.asList(
            "Java", "Spring Boot", "Microservices", "Hibernate", "JPA", "SQL", "PostgreSQL", "MySQL",
            "MongoDB", "REST API", "Docker", "Kubernetes", "AWS", "Git", "Kafka", "Redis",
            "JavaScript", "TypeScript", "React", "HTML", "CSS", "Python", "Data Structures", "Algorithms",
            "System Design", "CI/CD", "Maven", "Gradle", "JUnit", "Mockito"
    );

    private GroqService groqService;
    private GeminiService geminiService;
    private ObjectMapper objectMapper;

    public PdfResumeParserService() {
        this.objectMapper = new ObjectMapper();
    }

    @Autowired
    public PdfResumeParserService(GroqService groqService, GeminiService geminiService, ObjectMapper objectMapper) {
        this.groqService = groqService;
        this.geminiService = geminiService;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    /**
     * Extracts text from PDF stream and applies intelligent AI parsing
     */
    public CandidateProfile parseResumePdf(InputStream pdfInputStream) {
        CandidateProfile profile = new CandidateProfile();
        try {
            byte[] bytes = pdfInputStream.readAllBytes();
            if (bytes.length == 0) {
                return profile;
            }
            try (PDDocument document = Loader.loadPDF(bytes)) {
                PDFTextStripper stripper = new PDFTextStripper();
                String rawText = stripper.getText(document);
                return parseResumeText(rawText);
            }
        } catch (Exception e) {
            log.error("Failed to parse PDF resume bytes: {}", e.getMessage());
            profile.setFullName("Candidate");
            profile.setTargetRole("Software Engineer");
        }
        return profile;
    }

    /**
     * Parses raw resume text with AI deep extraction and rule-based baseline fallback
     */
    public CandidateProfile parseResumeText(String rawText) {
        CandidateProfile profile = new CandidateProfile();
        if (rawText == null || rawText.isBlank()) {
            return profile;
        }

        profile.setRawResumeText(rawText);

        // 1. Initial heuristic baseline
        profile.setFullName(extractName(rawText));
        profile.setEmail(extractEmail(rawText));
        profile.setPhone(extractPhone(rawText));
        profile.setExtractedSkills(extractSkills(rawText));
        profile.setTargetRole(inferRole(rawText));

        // 2. AI Deep Extraction via Groq (LLaMA 3.3 70B) or Gemini
        enhanceProfileWithAi(rawText, profile);

        return profile;
    }

    private void enhanceProfileWithAi(String rawText, CandidateProfile profile) {
        boolean hasGroq = groqService != null && groqService.isConfigured();
        boolean hasGemini = geminiService != null && geminiService.isConfigured();

        if (!hasGroq && !hasGemini) {
            log.info("No external AI key configured; using rule-based resume profile for {}", profile.getFullName());
            return;
        }

        try {
            String prompt = buildAiParsingPrompt(rawText);
            String aiResponse = null;

            if (hasGroq) {
                aiResponse = groqService.callGroq(
                        "You are an expert technical recruiter and resume parser. Output strictly valid JSON with no markdown wrapping.",
                        prompt
                );
            }

            if ((aiResponse == null || aiResponse.isBlank()) && hasGemini) {
                aiResponse = geminiService.callGemini(prompt);
            }

            if (aiResponse != null && !aiResponse.isBlank()) {
                applyAiJsonToProfile(aiResponse, profile);
            }
        } catch (Exception e) {
            log.warn("AI resume enhancement failed, preserving regex profile: {}", e.getMessage());
        }
    }

    private String buildAiParsingPrompt(String rawText) {
        String truncatedText = rawText.length() > 9000 ? rawText.substring(0, 9000) : rawText;
        return "Extract candidate details from this resume text into JSON.\n\n"
                + "RESUME TEXT:\n" + truncatedText + "\n\n"
                + "Return strictly valid JSON with this exact structure:\n"
                + "{\n"
                + "  \"name\": \"Candidate Full Name in Title Case (letters only, no phone numbers, no emails)\",\n"
                + "  \"targetRole\": \"Job title or target engineering role\",\n"
                + "  \"experienceLevel\": \"Fresher / Junior | Mid-Level | Senior\",\n"
                + "  \"email\": \"Candidate email or empty string\",\n"
                + "  \"phone\": \"Candidate phone or empty string\",\n"
                + "  \"summary\": \"2-3 sentence professional summary of candidate qualifications and strengths\",\n"
                + "  \"skills\": [\"Skill1\", \"Skill2\", \"Skill3\"],\n"
                + "  \"projects\": [\n"
                + "    {\n"
                + "      \"name\": \"Project Title\",\n"
                + "      \"techStack\": [\"Tech1\", \"Tech2\"],\n"
                + "      \"description\": \"1-2 sentence description\"\n"
                + "    }\n"
                + "  ]\n"
                + "}";
    }

    private void applyAiJsonToProfile(String jsonResponse, CandidateProfile profile) {
        try {
            String clean = jsonResponse.trim();
            if (clean.startsWith("```json")) {
                clean = clean.substring(7);
            } else if (clean.startsWith("```")) {
                clean = clean.substring(3);
            }
            if (clean.endsWith("```")) {
                clean = clean.substring(0, clean.length() - 3);
            }
            clean = clean.trim();

            JsonNode root = objectMapper.readTree(clean);

            String name = root.path("name").asText(root.path("fullName").asText(""));
            if (!name.isBlank() && !name.equalsIgnoreCase("Candidate") && !name.equalsIgnoreCase("Candidate Full Name")) {
                String cleanedName = cleanNameString(name);
                if (!cleanedName.isBlank() && !cleanedName.equalsIgnoreCase("Candidate")) {
                    profile.setFullName(cleanedName);
                }
            }

            String role = root.path("targetRole").asText("");
            if (!role.isBlank()) {
                profile.setTargetRole(role);
            }

            String exp = root.path("experienceLevel").asText("");
            if (!exp.isBlank()) {
                profile.setExperienceLevel(exp);
            }

            String email = root.path("email").asText("");
            if (!email.isBlank() && profile.getEmail().isBlank()) {
                profile.setEmail(email);
            }

            String phone = root.path("phone").asText("");
            if (!phone.isBlank() && profile.getPhone().isBlank()) {
                profile.setPhone(phone);
            }

            String summary = root.path("summary").asText("");
            if (!summary.isBlank()) {
                profile.setSummary(summary);
            }

            // Skills
            Set<String> allSkills = new LinkedHashSet<>(profile.getExtractedSkills());
            JsonNode skillsNode = root.path("skills");
            if (skillsNode.isArray()) {
                for (JsonNode s : skillsNode) {
                    if (!s.asText().isBlank()) {
                        allSkills.add(s.asText().trim());
                    }
                }
            } else if (skillsNode.isObject()) {
                skillsNode.fields().forEachRemaining(entry -> {
                    if (entry.getValue().isArray()) {
                        for (JsonNode s : entry.getValue()) {
                            if (!s.asText().isBlank()) {
                                allSkills.add(s.asText().trim());
                            }
                        }
                    }
                });
            }
            if (!allSkills.isEmpty()) {
                profile.setExtractedSkills(new ArrayList<>(allSkills));
            }

            // Projects
            JsonNode projectsNode = root.path("projects");
            if (projectsNode.isArray()) {
                List<Map<String, Object>> projectList = new ArrayList<>();
                List<String> projectNames = new ArrayList<>();
                for (JsonNode p : projectsNode) {
                    Map<String, Object> pMap = new HashMap<>();
                    String pName = p.path("name").asText("");
                    String pDesc = p.path("description").asText("");
                    List<String> techList = new ArrayList<>();
                    JsonNode techArr = p.path("techStack");
                    if (techArr.isArray()) {
                        for (JsonNode t : techArr) {
                            techList.add(t.asText());
                        }
                    }
                    if (!pName.isBlank()) {
                        pMap.put("name", pName);
                        pMap.put("description", pDesc);
                        pMap.put("techStack", techList);
                        projectList.add(pMap);
                        projectNames.add(pName);
                    }
                }
                if (!projectList.isEmpty()) {
                    profile.setProjects(projectList);
                    profile.setExtractedProjects(projectNames);
                }
            }

            log.info("AI resume analysis succeeded: Name = '{}', Role = '{}', Skills = {}, Projects = {}",
                    profile.getFullName(), profile.getTargetRole(), profile.getExtractedSkills().size(), profile.getProjects().size());
        } catch (Exception e) {
            log.warn("Failed to parse AI JSON response: {}", e.getMessage());
        }
    }

    private String cleanNameString(String name) {
        if (name == null) return "Candidate";
        String cleaned = name
                .replaceAll("([a-z])([A-Z])", "$1 $2")
                .replaceAll("[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}", "")
                .replaceAll("(\\+?\\d{1,4}[-.\\s]?)?\\(?\\d{2,5}\\)?[-.\\s]?\\d{3,5}[-.\\s]?\\d{3,5}", "")
                .replaceAll("[+0-9]", "")
                .replaceAll("[|•*_\\-—~/:,()#$@]", " ")
                .replaceAll("(?i)\\b(resume|curriculum|vitae|page|phone|mobile|mob|tel|email|contact|github|linkedin|portfolio)\\b", "")
                .replaceAll("\\s+", " ")
                .trim();

        if (cleaned.isBlank()) return "Candidate";

        String[] parts = cleaned.split("\\s+");
        StringBuilder sb = new StringBuilder();
        int count = 0;
        for (String p : parts) {
            if (p.length() > 1 && count < 3) {
                if (sb.length() > 0) sb.append(" ");
                sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1).toLowerCase());
                count++;
            }
        }
        return sb.length() > 0 ? sb.toString() : "Candidate";
    }

    private String extractName(String text) {
        if (text == null || text.isBlank()) return "Candidate";
        String[] lines = text.split("\\r?\\n");
        for (String line : lines) {
            String clean = line.trim();
            if (clean.length() > 2 && clean.length() < 35 && clean.matches("^[a-zA-Z\\s.]+$")) {
                if (!clean.toLowerCase().contains("resume") && !clean.toLowerCase().contains("curriculum")) {
                    return cleanNameString(clean);
                }
            }
        }
        return "Candidate";
    }

    private String extractEmail(String text) {
        if (text == null) return "";
        Pattern pattern = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }
        return "";
    }

    private String extractPhone(String text) {
        if (text == null) return "";
        Pattern pattern = Pattern.compile("(\\+?[0-9]{1,3}[-\\s.]?)?\\(?([0-9]{3})\\)?[-\\s.]?([0-9]{3})[-\\s.]?([0-9]{4})");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }
        return "";
    }

    private List<String> extractSkills(String text) {
        List<String> found = new ArrayList<>();
        if (text == null) return found;
        String lower = text.toLowerCase();
        for (String skill : COMMON_SKILLS) {
            Pattern p = Pattern.compile("\\b" + Pattern.quote(skill.toLowerCase()) + "\\b");
            if (p.matcher(lower).find()) {
                found.add(skill);
            }
        }
        return found;
    }

    private String inferRole(String text) {
        if (text == null) return "Software Engineer";
        String lower = text.toLowerCase();
        if (lower.contains("backend") || lower.contains("spring") || lower.contains("java developer")) {
            return "Java Backend Engineer";
        } else if (lower.contains("full stack") || lower.contains("fullstack")) {
            return "Full Stack Developer";
        } else if (lower.contains("frontend") || lower.contains("react")) {
            return "Frontend Engineer";
        } else if (lower.contains("devops") || lower.contains("cloud")) {
            return "Cloud / DevOps Engineer";
        }
        return "Software Engineer";
    }
}

