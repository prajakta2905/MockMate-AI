package com.mockmate.ai.service;

import com.mockmate.ai.model.CandidateProfile;
import com.mockmate.ai.model.InterviewSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class InterviewSessionStoreTest {

    private InterviewSessionStore sessionStore;

    @BeforeEach
    void setUp() {
        sessionStore = new InterviewSessionStore();
    }

    @Test
    @DisplayName("Should initialize and maintain thread-safe interview session profile state")
    void testSessionLifecycle() {
        assertNotNull(sessionStore.getCurrentSession());
        assertNotNull(sessionStore.getProfile());

        CandidateProfile newProfile = new CandidateProfile("Prajakta Gudadhe", "Full Stack Java Developer");
        newProfile.getExtractedSkills().add("Java 21");
        newProfile.getExtractedSkills().add("Spring Boot 3");

        sessionStore.setProfile(newProfile);

        CandidateProfile retrieved = sessionStore.getProfile();
        assertEquals("Prajakta Gudadhe", retrieved.getFullName());
        assertEquals("Full Stack Java Developer", retrieved.getTargetRole());
        assertTrue(retrieved.getExtractedSkills().contains("Spring Boot 3"));

        // Reset session
        sessionStore.resetSession();
        assertNotNull(sessionStore.getCurrentSession());
    }

    @Test
    @DisplayName("Should retrieve unique sessions per sessionId")
    void testMultipleSessions() {
        InterviewSession session1 = sessionStore.getSession("session-1");
        InterviewSession session2 = sessionStore.getSession("session-2");

        assertNotNull(session1);
        assertNotNull(session2);
        assertNotSame(session1, session2);
    }
}
