package com.mockmate.ai.service;

import com.mockmate.ai.model.CandidateProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class PdfResumeParserServiceTest {

    private PdfResumeParserService parserService;

    @BeforeEach
    void setUp() {
        parserService = new PdfResumeParserService();
    }

    @Test
    @DisplayName("Should gracefully handle corrupted or empty input stream with fallback profile")
    void testParseResumePdf_EmptyStream() {
        InputStream emptyStream = new ByteArrayInputStream(new byte[0]);
        CandidateProfile profile = parserService.parseResumePdf(emptyStream);

        assertNotNull(profile);
        assertEquals("Candidate", profile.getFullName());
        assertEquals("Software Engineer", profile.getTargetRole());
    }

    @Test
    @DisplayName("Should extract baseline skills and name from resume text")
    void testParseResumeText() {
        String sampleText = "Prajakta Gudadhe\nJava Backend Engineer\nprajakta@example.com\nSkills: Java, Spring Boot, Docker, PostgreSQL\n";
        CandidateProfile profile = parserService.parseResumeText(sampleText);

        assertNotNull(profile);
        assertEquals("Prajakta Gudadhe", profile.getFullName());
        assertTrue(profile.getExtractedSkills().contains("Java"));
        assertTrue(profile.getExtractedSkills().contains("Spring Boot"));
    }
}
