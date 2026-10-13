package com.mockmate.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockmate.ai.entity.InterviewRecordEntity;
import com.mockmate.ai.model.PracticeHistoryRecord;
import com.mockmate.ai.repository.InterviewRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class HistoryService {
    private static final Logger log = LoggerFactory.getLogger(HistoryService.class);

    private final InterviewRecordRepository recordRepository;
    private final ObjectMapper objectMapper;

    public HistoryService(InterviewRecordRepository recordRepository, ObjectMapper objectMapper) {
        this.recordRepository = recordRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PracticeHistoryRecord saveRecord(PracticeHistoryRecord record) {
        if (record.getId() == null || record.getId().isBlank()) {
            record.setId(UUID.randomUUID().toString());
        }

        try {
            String reportJson = record.getReportData() != null ? objectMapper.writeValueAsString(record.getReportData()) : "{}";
            InterviewRecordEntity entity = new InterviewRecordEntity(
                    record.getId(),
                    record.getUserId(),
                    "Candidate",
                    record.getRole() != null ? record.getRole() : "Software Engineer",
                    record.getScore(),
                    record.getHiringDecision() != null ? record.getHiringDecision() : "Hire",
                    record.getDurationMinutes(),
                    record.getAnswerCount(),
                    reportJson
            );
            recordRepository.save(entity);
        } catch (Exception e) {
            log.warn("Failed to persist history record to JPA repository: {}", e.getMessage());
        }

        return record;
    }

    @Transactional(readOnly = true)
    public List<PracticeHistoryRecord> getHistoryForUser(String userId) {
        List<InterviewRecordEntity> entities;
        if (userId != null && !userId.isBlank()) {
            entities = recordRepository.findByUserId(userId);
        } else {
            entities = recordRepository.findAllByOrderByCompletedAtDesc();
        }

        return entities.stream().map(e -> {
            PracticeHistoryRecord rec = new PracticeHistoryRecord();
            rec.setId(e.getSessionId());
            rec.setUserId(e.getUserId());
            rec.setRole(e.getTargetRole());
            rec.setScore(e.getOverallScore());
            rec.setAnswerCount(e.getTotalQuestions());
            rec.setDurationMinutes(e.getDurationMinutes());
            rec.setHiringDecision(e.getVerdict());
            rec.setCompletedAt(e.getCompletedAt());
            if (e.getReportJson() != null && !e.getReportJson().isBlank()) {
                try {
                    rec.setReportData(objectMapper.readValue(e.getReportJson(), Map.class));
                } catch (Exception parseEx) {
                    rec.setReportData(Collections.emptyMap());
                }
            }
            return rec;
        }).collect(Collectors.toList());
    }

    @Transactional
    public boolean deleteRecord(String id) {
        Optional<InterviewRecordEntity> entityOpt = recordRepository.findBySessionId(id);
        if (entityOpt.isPresent()) {
            recordRepository.delete(entityOpt.get());
            return true;
        }
        return false;
    }
}
