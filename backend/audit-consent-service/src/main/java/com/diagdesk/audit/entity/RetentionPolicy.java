package com.diagdesk.audit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "retention_policies", schema = "audit")
@Getter
@Setter
public class RetentionPolicy {

    @Id
    @Column(name = "policy_id", length = 36)
    private String policyId;

    @Column(name = "tenant_id", length = 36)
    private String tenantId;

    @Column(name = "data_category", nullable = false, length = 100)
    private String dataCategory;

    @Column(name = "retention_days", nullable = false)
    private Integer retentionDays;

    @Column(name = "action_on_expiry", nullable = false, length = 20)
    private String actionOnExpiry;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
