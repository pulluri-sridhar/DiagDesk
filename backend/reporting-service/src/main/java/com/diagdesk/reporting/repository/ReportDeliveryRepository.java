package com.diagdesk.reporting.repository;

import com.diagdesk.reporting.entity.ReportDelivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportDeliveryRepository extends JpaRepository<ReportDelivery, String> {
    List<ReportDelivery> findByReport_ReportId(String reportId);
}
