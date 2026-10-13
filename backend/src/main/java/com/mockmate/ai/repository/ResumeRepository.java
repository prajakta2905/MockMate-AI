package com.mockmate.ai.repository;

import com.mockmate.ai.entity.ResumeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResumeRepository extends JpaRepository<ResumeEntity, Long> {
    List<ResumeEntity> findByUserId(String userId);
    List<ResumeEntity> findByEmail(String email);
    List<ResumeEntity> findAllByOrderByCreatedAtDesc();
}
