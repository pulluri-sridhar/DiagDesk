package com.diagdesk.reporting.repository;

import com.diagdesk.reporting.entity.PrintLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrintLogRepository extends JpaRepository<PrintLog, String> {
    List<PrintLog> findByReport_ReportIdOrderByPrintedAtAsc(String reportId);
}
