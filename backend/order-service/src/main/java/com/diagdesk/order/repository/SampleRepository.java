package com.diagdesk.order.repository;

import com.diagdesk.order.entity.Sample;
import com.diagdesk.order.entity.Sample.SampleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SampleRepository extends JpaRepository<Sample, String> {

    Optional<Sample> findByAccessionNumber(String accessionNumber);

    List<Sample> findAllByOrderOrderId(String orderId);

    /** Worklist: samples in received/in_process state for the given branch. */
    @Query("""
            SELECT s FROM Sample s JOIN s.order o
            WHERE o.tenantId = :tenantId
              AND (:branchId IS NULL OR o.branchId = :branchId)
              AND s.status IN ('received', 'in_process')
              AND (:dateFrom IS NULL OR s.collectedAt >= :dateFrom)
            ORDER BY o.priority DESC, s.tatDeadline ASC NULLS LAST
            """)
    List<Sample> findWorklist(
            @Param("tenantId")  String tenantId,
            @Param("branchId")  String branchId,
            @Param("dateFrom")  Instant dateFrom);

    /** Samples with status=reported but not yet handed over. */
    @Query("""
            SELECT s FROM Sample s JOIN s.order o
            WHERE o.tenantId = :tenantId
              AND s.status = 'reported'
              AND s.handedOverAt IS NULL
            ORDER BY s.reportedAt ASC
            """)
    List<Sample> findHandoverPending(@Param("tenantId") String tenantId);

    /** TAT breach check — scheduled task updates tat_breached flag. */
    @Query("""
            SELECT s FROM Sample s
            WHERE s.tenantId   = :tenantId
              AND s.tatDeadline < :now
              AND s.tatBreached = false
              AND s.status NOT IN ('reported', 'handed_over', 'rejected')
            """)
    List<Sample> findUnmarkedBreaches(
            @Param("tenantId") String tenantId,
            @Param("now")      Instant now);
}
