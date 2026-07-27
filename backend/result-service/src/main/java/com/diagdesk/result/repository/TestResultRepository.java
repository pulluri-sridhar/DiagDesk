package com.diagdesk.result.repository;

import com.diagdesk.result.entity.TestResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TestResultRepository extends JpaRepository<TestResult, String> {

    Optional<TestResult> findByResultIdAndTenantId(String resultId, String tenantId);

    List<TestResult> findByAccessionIdAndTenantId(String accessionId, String tenantId);

    List<TestResult> findByOrderIdAndTenantId(String orderId, String tenantId);

    Page<TestResult> findByTenantIdAndValidationStatusIn(
            String tenantId,
            List<TestResult.ValidationStatus> statuses,
            Pageable pageable);

    // Pending-validation queue filterable by branch/department (department via test_id cross-ref — branch is direct)
    @Query("""
        SELECT r FROM TestResult r
        WHERE r.tenantId = :tenantId
          AND r.validationStatus IN :statuses
          AND (:branchId IS NULL OR r.branchId = :branchId)
        ORDER BY r.createdAt ASC
        """)
    Page<TestResult> findPendingValidation(
            @Param("tenantId") String tenantId,
            @Param("statuses") List<TestResult.ValidationStatus> statuses,
            @Param("branchId") String branchId,
            Pageable pageable);

    // Unacknowledged critical alerts: flagged results with no acknowledgement record
    @Query("""
        SELECT r FROM TestResult r
        WHERE r.tenantId = :tenantId
          AND r.flags IS NOT NULL
          AND (r.flags LIKE '%CRITICAL%')
          AND r.resultId NOT IN (
              SELECT ca.resultId FROM CriticalAcknowledgement ca
              WHERE ca.resultId = r.resultId
          )
        ORDER BY r.createdAt DESC
        """)
    List<TestResult> findUnacknowledgedCriticals(@Param("tenantId") String tenantId);

    // Delta check: find the most recent previous result for the same patient + test
    @Query("""
        SELECT r FROM TestResult r
        WHERE r.tenantId = :tenantId
          AND r.patientId = :patientId
          AND r.testId = :testId
          AND r.resultId <> :currentResultId
          AND r.validationStatus NOT IN ('PENDING', 'PENDING_RERUN')
        ORDER BY r.createdAt DESC
        """)
    List<TestResult> findPreviousResults(
            @Param("tenantId") String tenantId,
            @Param("patientId") String patientId,
            @Param("testId") String testId,
            @Param("currentResultId") String currentResultId,
            Pageable pageable);
}
