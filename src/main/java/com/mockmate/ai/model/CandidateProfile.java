package com.mockmate.ai.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CandidateProfile implements Serializable {
    private String fullName = "Candidate";
    private String email = "";
    private String phone = "";
    private String targetRole = "Software Engineer";
    private String experienceLevel = "Fresher / Junior";
    private String rawResumeText = "";
    private String summary = "";
    private List<String> extractedSkills = new ArrayList<>();
    private List<String> extractedProjects = new ArrayList<>();
    private List<Map<String, Object>> projects = new ArrayList<>();
    private Map<String, List<String>> skills = new HashMap<>();

    public CandidateProfile() {}

    public CandidateProfile(String fullName, String targetRole) {
        this.fullName = fullName;
        this.targetRole = targetRole;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    // Alias for frontend compatibility
    public String getName() {
        return fullName;
    }

    public void setName(String name) {
        this.fullName = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getTargetRole() {
        return targetRole;
    }

    public void setTargetRole(String targetRole) {
        this.targetRole = targetRole;
    }

    public String getExperienceLevel() {
        return experienceLevel;
    }

    public void setExperienceLevel(String experienceLevel) {
        this.experienceLevel = experienceLevel;
    }

    public String getYearsOfExperience() {
        return experienceLevel;
    }

    public void setYearsOfExperience(String years) {
        this.experienceLevel = years;
    }

    public String getRawResumeText() {
        return rawResumeText;
    }

    public void setRawResumeText(String rawResumeText) {
        this.rawResumeText = rawResumeText;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary != null ? summary : "";
    }

    public List<String> getExtractedSkills() {
        return extractedSkills;
    }

    public void setExtractedSkills(List<String> extractedSkills) {
        this.extractedSkills = extractedSkills != null ? extractedSkills : new ArrayList<>();
    }

    public List<String> getExtractedProjects() {
        return extractedProjects;
    }

    public void setExtractedProjects(List<String> extractedProjects) {
        this.extractedProjects = extractedProjects != null ? extractedProjects : new ArrayList<>();
    }

    public List<Map<String, Object>> getProjects() {
        return projects;
    }

    public void setProjects(List<Map<String, Object>> projects) {
        this.projects = projects != null ? projects : new ArrayList<>();
    }

    public Map<String, List<String>> getSkills() {
        if ((skills == null || skills.isEmpty()) && !extractedSkills.isEmpty()) {
            Map<String, List<String>> categorized = new HashMap<>();
            int split = Math.min(4, extractedSkills.size());
            categorized.put("frontend", new ArrayList<>(extractedSkills.subList(0, split)));
            categorized.put("backend", new ArrayList<>(extractedSkills.subList(split, extractedSkills.size())));
            return categorized;
        }
        return skills != null ? skills : new HashMap<>();
    }

    public void setSkills(Map<String, List<String>> skills) {
        this.skills = skills != null ? skills : new HashMap<>();
    }
}

