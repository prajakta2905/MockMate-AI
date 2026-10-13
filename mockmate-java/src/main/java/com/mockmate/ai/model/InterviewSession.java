package com.mockmate.ai.model;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class InterviewSession implements Serializable {
    private String sessionId;
    private CandidateProfile profile;
    private QuestionPool questionPool;
    private int currentQuestionIndex = 0;
    private List<InterviewQuestion> conversationHistory = new ArrayList<>();
    private EvaluationReport finalReport;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    public InterviewSession() {
        this.sessionId = String.valueOf(System.currentTimeMillis());
        this.startTime = LocalDateTime.now();
    }

    public String getSessionId() {
        return sessionId;
    }

    public CandidateProfile getProfile() {
        return profile;
    }

    public void setProfile(CandidateProfile profile) {
        this.profile = profile;
    }

    public QuestionPool getQuestionPool() {
        return questionPool;
    }

    public void setQuestionPool(QuestionPool questionPool) {
        this.questionPool = questionPool;
    }

    public int getCurrentQuestionIndex() {
        return currentQuestionIndex;
    }

    public void setCurrentQuestionIndex(int currentQuestionIndex) {
        this.currentQuestionIndex = currentQuestionIndex;
    }

    public List<InterviewQuestion> getConversationHistory() {
        return conversationHistory;
    }

    public void setConversationHistory(List<InterviewQuestion> conversationHistory) {
        this.conversationHistory = (conversationHistory != null) ? conversationHistory : new ArrayList<>();
    }

    public void addCompletedQuestion(InterviewQuestion q) {
        this.conversationHistory.add(q);
    }

    public EvaluationReport getFinalReport() {
        return finalReport;
    }

    public void setFinalReport(EvaluationReport finalReport) {
        this.finalReport = finalReport;
        this.endTime = LocalDateTime.now();
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }
}
