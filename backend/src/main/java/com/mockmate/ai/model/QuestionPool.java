package com.mockmate.ai.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class QuestionPool implements Serializable {
    private InterviewQuestion warmupQuestion;
    private List<InterviewQuestion> technicalQuestions = new ArrayList<>();
    private List<InterviewQuestion> behavioralQuestions = new ArrayList<>();

    public QuestionPool() {}

    public InterviewQuestion getWarmupQuestion() {
        return warmupQuestion;
    }

    public void setWarmupQuestion(InterviewQuestion warmupQuestion) {
        this.warmupQuestion = warmupQuestion;
    }

    public List<InterviewQuestion> getTechnicalQuestions() {
        return technicalQuestions;
    }

    public void setTechnicalQuestions(List<InterviewQuestion> technicalQuestions) {
        this.technicalQuestions = technicalQuestions;
    }

    public List<InterviewQuestion> getBehavioralQuestions() {
        return behavioralQuestions;
    }

    public void setBehavioralQuestions(List<InterviewQuestion> behavioralQuestions) {
        this.behavioralQuestions = behavioralQuestions;
    }

    public List<InterviewQuestion> getAllQuestions() {
        List<InterviewQuestion> all = new ArrayList<>();
        if (warmupQuestion != null) {
            all.add(warmupQuestion);
        }
        all.addAll(technicalQuestions);
        all.addAll(behavioralQuestions);
        return all;
    }
}
