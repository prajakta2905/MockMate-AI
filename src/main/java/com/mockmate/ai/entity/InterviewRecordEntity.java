package com.mockmate.ai.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "interview_records")
public class InterviewRecordEntity implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sessionId;

    private String userId;

    @Column(nullable = false)
    private String candidateName;

    @Column(nullable = false)
    private String targetRole;

    private int overallScore;

    private String verdict;

    private int durationMinutes;

    private int totalQuestions;

    @Column(columnDefinition = "TEXT")
    private String reportJson;

    @Column(nullable = false)
    private LocalDateTime completedAt;

    public InterviewRecordEntity() {
        this.completedAt = LocalDateTime.now();
    }

    public InterviewRecordEntity(String sessionId, String userId, String candidateName, String targetRole,
                                 int overallScore, String verdict, int durationMinutes,
                                 int totalQuestions, String reportJson) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.candidateName = candidateName;
        this.targetRole = targetRole;
        this.overallScore = overallScore;
        this.verdict = verdict;
        this.durationMinutes = durationMinutes;
        this.totalQuestions = totalQuestions;
        this.reportJson = reportJson;
        this.completedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getCandidateName() {
        return candidateName;
    }

    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }

    public String getTargetRole() {
        return targetRole;
    }

    public void setTargetRole(String targetRole) {
        this.targetRole = targetRole;
    }

    public int getOverallScore() {
        return overallScore;
    }

    public void setOverallScore(int overallScore) {
        this.overallScore = overallScore;
    }

    public String getVerdict() {
        return verdict;
    }

    public void setVerdict(String verdict) {
        this.verdict = verdict;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public int getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(int totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public String getReportJson() {
        return reportJson;
    }

    public void setReportJson(String reportJson) {
        this.reportJson = reportJson;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}
