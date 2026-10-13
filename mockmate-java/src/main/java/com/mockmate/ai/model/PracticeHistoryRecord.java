package com.mockmate.ai.model;

import java.io.Serializable;
import java.time.LocalDateTime;

public class PracticeHistoryRecord implements Serializable {
    private String id;
    private String userId;
    private String role;
    private int score;
    private int answerCount;
    private int durationMinutes;
    private String hiringDecision;
    private LocalDateTime completedAt;
    private Object reportData;

    public PracticeHistoryRecord() {
        this.completedAt = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public int getAnswerCount() {
        return answerCount;
    }

    public void setAnswerCount(int answerCount) {
        this.answerCount = answerCount;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public String getHiringDecision() {
        return hiringDecision;
    }

    public void setHiringDecision(String hiringDecision) {
        this.hiringDecision = hiringDecision;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public Object getReportData() {
        return reportData;
    }

    public void setReportData(Object reportData) {
        this.reportData = reportData;
    }
}
