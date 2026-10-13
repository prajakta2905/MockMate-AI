package com.mockmate.ai.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class EvaluationReport implements Serializable {
    private int overallScore = 0; // 0 to 100
    private int technicalAccuracyScore = 0;
    private int communicationClarityScore = 0;
    private int problemSolvingScore = 0;
    private int confidenceScore = 0;

    private String verdict = "Needs Improvement"; // Outstanding, Strong Hire, Hire, Needs Practice
    private String executiveSummary = "";
    private List<String> topStrengths = new ArrayList<>();
    private List<String> areasOfImprovement = new ArrayList<>();
    private List<String> recommendedNextSteps = new ArrayList<>();

    public EvaluationReport() {}

    public int getOverallScore() {
        return overallScore;
    }

    public void setOverallScore(int overallScore) {
        this.overallScore = overallScore;
    }

    public int getTechnicalAccuracyScore() {
        return technicalAccuracyScore;
    }

    public void setTechnicalAccuracyScore(int technicalAccuracyScore) {
        this.technicalAccuracyScore = technicalAccuracyScore;
    }

    public int getCommunicationClarityScore() {
        return communicationClarityScore;
    }

    public void setCommunicationClarityScore(int communicationClarityScore) {
        this.communicationClarityScore = communicationClarityScore;
    }

    public int getProblemSolvingScore() {
        return problemSolvingScore;
    }

    public void setProblemSolvingScore(int problemSolvingScore) {
        this.problemSolvingScore = problemSolvingScore;
    }

    public int getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(int confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public String getVerdict() {
        return verdict;
    }

    public void setVerdict(String verdict) {
        this.verdict = verdict;
    }

    public String getExecutiveSummary() {
        return executiveSummary;
    }

    public void setExecutiveSummary(String executiveSummary) {
        this.executiveSummary = executiveSummary;
    }

    public List<String> getTopStrengths() {
        return topStrengths;
    }

    public void setTopStrengths(List<String> topStrengths) {
        this.topStrengths = topStrengths;
    }

    public List<String> getAreasOfImprovement() {
        return areasOfImprovement;
    }

    public void setAreasOfImprovement(List<String> areasOfImprovement) {
        this.areasOfImprovement = areasOfImprovement;
    }

    public List<String> getRecommendedNextSteps() {
        return recommendedNextSteps;
    }

    public void setRecommendedNextSteps(List<String> recommendedNextSteps) {
        this.recommendedNextSteps = recommendedNextSteps;
    }
}
