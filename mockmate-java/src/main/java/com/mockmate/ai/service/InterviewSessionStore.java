package com.mockmate.ai.service;

import com.mockmate.ai.model.CandidateProfile;
import com.mockmate.ai.model.EvaluationReport;
import com.mockmate.ai.model.InterviewSession;
import com.mockmate.ai.model.QuestionPool;
import org.springframework.stereotype.Component;

import java.io.Serializable;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe store keeping active interview state for REST API clients.
 */
@Component
public class InterviewSessionStore implements Serializable {
    private final Map<String, InterviewSession> sessions = new ConcurrentHashMap<>();
    private static final String DEFAULT_KEY = "default";

    public InterviewSessionStore() {
        InterviewSession defaultSession = new InterviewSession();
        CandidateProfile defaultProfile = new CandidateProfile("Candidate", "Software Engineer");
        defaultProfile.getExtractedSkills().add("Java");
        defaultProfile.getExtractedSkills().add("Spring Boot");
        defaultProfile.getExtractedSkills().add("REST API");
        defaultSession.setProfile(defaultProfile);
        sessions.put(DEFAULT_KEY, defaultSession);
    }

    public InterviewSession getSession(String sessionId) {
        String key = (sessionId == null || sessionId.isBlank()) ? DEFAULT_KEY : sessionId;
        return sessions.computeIfAbsent(key, k -> {
            InterviewSession s = new InterviewSession();
            s.setProfile(new CandidateProfile("Candidate", "Software Engineer"));
            return s;
        });
    }

    public InterviewSession getCurrentSession() {
        return getSession(DEFAULT_KEY);
    }

    public void resetSession(String sessionId) {
        String key = (sessionId == null || sessionId.isBlank()) ? DEFAULT_KEY : sessionId;
        sessions.put(key, new InterviewSession());
    }

    public void resetSession() {
        resetSession(DEFAULT_KEY);
    }

    public void setProfile(CandidateProfile profile) {
        getCurrentSession().setProfile(profile);
    }

    public CandidateProfile getProfile() {
        return getCurrentSession().getProfile();
    }

    public void setQuestionPool(QuestionPool pool) {
        getCurrentSession().setQuestionPool(pool);
    }

    public QuestionPool getQuestionPool() {
        return getCurrentSession().getQuestionPool();
    }

    public void setFinalReport(EvaluationReport report) {
        getCurrentSession().setFinalReport(report);
    }

    public EvaluationReport getFinalReport() {
        return getCurrentSession().getFinalReport();
    }
}
