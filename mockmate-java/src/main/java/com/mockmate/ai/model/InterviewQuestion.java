package com.mockmate.ai.model;

import java.io.Serializable;

public class InterviewQuestion implements Serializable {
    private String id;
    private String category; // WARMUP, TECHNICAL, BEHAVIORAL, FOLLOW_UP
    private String questionText;
    private String contextHint;
    private String candidateAnswer = "";
    private int score = 0; // 0 to 100
    private String feedback = "";
    private boolean completed = false;

    public InterviewQuestion() {}

    public InterviewQuestion(String id, String category, String questionText, String contextHint) {
        this.id = id;
        this.category = category;
        this.questionText = questionText;
        this.contextHint = contextHint;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getQuestionText() {
        return questionText;
    }

    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }

    public String getContextHint() {
        return contextHint;
    }

    public void setContextHint(String contextHint) {
        this.contextHint = contextHint;
    }

    public String getCandidateAnswer() {
        return candidateAnswer;
    }

    public void setCandidateAnswer(String candidateAnswer) {
        this.candidateAnswer = candidateAnswer;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }
}
