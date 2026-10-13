package com.mockmate.ai.service;

import com.mockmate.ai.model.CandidateProfile;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
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

    public CandidateProfile parseResumePdf(InputStream pdfInputStream) {
        CandidateProfile profile = new CandidateProfile();
        try {
            byte[] bytes = pdfInputStream.readAllBytes();
            try (PDDocument document = Loader.loadPDF(bytes)) {
                PDFTextStripper stripper = new PDFTextStripper();
                String rawText = stripper.getText(document);
                profile.setRawResumeText(rawText);

                // Extract Details using Regex & Rule-based heuristics
                profile.setFullName(extractName(rawText));
                profile.setEmail(extractEmail(rawText));
                profile.setPhone(extractPhone(rawText));
                profile.setExtractedSkills(extractSkills(rawText));
                profile.setTargetRole(inferRole(rawText));
            }
        } catch (Exception e) {
            log.error("Failed to parse PDF resume", e);
            profile.setFullName("Candidate");
            profile.setTargetRole("Software Engineer");
        }
        return profile;
    }

    private String extractName(String text) {
        if (text == null || text.isBlank()) return "Candidate";
        String[] lines = text.split("\\r?\\n");
        for (String line : lines) {
            String clean = line.trim();
            // Candidate names are usually in the top lines, between 2 to 4 words, letters only
            if (clean.length() > 2 && clean.length() < 35 && clean.matches("^[a-zA-Z\\s.]+$")) {
                if (!clean.toLowerCase().contains("resume") && !clean.toLowerCase().contains("curriculum")) {
                    return clean;
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
            // Match word boundaries
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
