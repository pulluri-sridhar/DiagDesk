package com.diagdesk.result.repository;

import com.diagdesk.result.entity.ResultValidation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResultValidationRepository extends JpaRepository<ResultValidation, String> {
    List<ResultValidation> findByResultResultIdOrderByValidatedAtAsc(String resultId);
}
