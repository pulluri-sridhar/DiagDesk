package com.diagdesk.analytics.repository;

import com.diagdesk.analytics.entity.DailyMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DailyMetricRepository extends JpaRepository<DailyMetric, String> {

    List<DailyMetric> findByTenantIdAndMetricDateBetween(String tenantId, LocalDate from, LocalDate to);

    List<DailyMetric> findByTenantIdAndMetricTypeAndMetricDateBetween(
            String tenantId, String metricType, LocalDate from, LocalDate to);

    List<DailyMetric> findByTenantIdAndBranchIdAndMetricType(
            String tenantId, String branchId, String metricType);

    List<DailyMetric> findByTenantIdAndMetricTypeAndMetricDate(
            String tenantId, String metricType, LocalDate metricDate);
}
