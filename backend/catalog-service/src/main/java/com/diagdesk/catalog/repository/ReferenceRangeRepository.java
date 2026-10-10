package com.diagdesk.catalog.repository;

import com.diagdesk.catalog.entity.TestReferenceRange;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReferenceRangeRepository extends JpaRepository<TestReferenceRange, String> {
    List<TestReferenceRange> findAllByTestTestId(String testId);
    Optional<TestReferenceRange> findByRangeIdAndTestTestId(String rangeId, String testId);
}
