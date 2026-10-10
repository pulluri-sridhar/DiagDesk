package com.diagdesk.analytics.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "daily_metrics", schema = "analytics")
@Getter
@Setter
public class DailyMetric {

    @Id
    @Column(name = "metric_id", length = 36)
    private String metricId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "branch_id", length = 36)
    private String branchId;

    @Column(name = "metric_date", nullable = false)
    private LocalDate metricDate;

    @Column(name = "metric_type", nullable = false, length = 50)
    private String metricType;

    @Column(name = "dimension_key", length = 100)
    private String dimensionKey;

    @Column(name = "dimension_value", length = 200)
    private String dimensionValue;

    @Column(name = "numeric_value", precision = 15, scale = 2)
    private BigDecimal numericValue;

    @Column(name = "count_value")
    private Long countValue;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
