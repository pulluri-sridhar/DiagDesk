package com.diagdesk.result.repository;

import com.diagdesk.result.entity.CriticalAcknowledgement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CriticalAcknowledgementRepository extends JpaRepository<CriticalAcknowledgement, String> {
    List<CriticalAcknowledgement> findByResultIdOrderByCreatedAtDesc(String resultId);
    boolean existsByResultId(String resultId);
}
