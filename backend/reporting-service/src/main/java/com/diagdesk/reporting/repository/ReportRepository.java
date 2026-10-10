package com.diagdesk.reporting.repository;

import com.diagdesk.reporting.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, String> {
    Optional<Report> findByOrderId(String orderId);
    List<Report> findByPatientIdOrderByCreatedAtDesc(String patientId);
    List<Report> findByBranchIdAndStatus(String branchId, Report.ReportStatus status);
}
