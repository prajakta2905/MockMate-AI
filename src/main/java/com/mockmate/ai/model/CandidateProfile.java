package com.mockmate.ai.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class CandidateProfile implements Serializable {
    private String fullName = "Candidate";
    private String email = "";
    private String phone = "";
    private String targetRole = "Software Engineer";
    private String experienceLevel = "Fresher / Junior";
    private String rawResumeText = "";
    private List<String> extractedSkills = new ArrayList<>();
    private List<String> extractedProjects = new ArrayList<>();

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

    public String getRawResumeText() {
        return rawResumeText;
    }

    public void setRawResumeText(String rawResumeText) {
        this.rawResumeText = rawResumeText;
    }

    public List<String> getExtractedSkills() {
        return extractedSkills;
    }

    public void setExtractedSkills(List<String> extractedSkills) {
        this.extractedSkills = extractedSkills;
    }

    public List<String> getExtractedProjects() {
        return extractedProjects;
    }

    public void setExtractedProjects(List<String> extractedProjects) {
        this.extractedProjects = extractedProjects;
    }
}
