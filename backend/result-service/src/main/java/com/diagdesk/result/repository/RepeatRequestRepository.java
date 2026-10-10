package com.diagdesk.result.repository;

import com.diagdesk.result.entity.RepeatRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepeatRequestRepository extends JpaRepository<RepeatRequest, String> {
    List<RepeatRequest> findByResultIdOrderByCreatedAtDesc(String resultId);
}
