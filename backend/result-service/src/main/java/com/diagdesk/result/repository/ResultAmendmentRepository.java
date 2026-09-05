package com.diagdesk.result.repository;

import com.diagdesk.result.entity.ResultAmendment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResultAmendmentRepository extends JpaRepository<ResultAmendment, String> {
    List<ResultAmendment> findByResultResultIdOrderByVersionAsc(String resultId);
}
