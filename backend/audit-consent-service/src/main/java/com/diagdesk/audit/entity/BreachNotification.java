package com.diagdesk.audit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "breach_notifications", schema = "audit")
@Getter
@Setter
public class BreachNotification {

    @Id
    @Column(name = "breach_id", length = 36)
    private String breachId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "affected_patients_count")
    private Integer affectedPatientsCount;

    @Column(name = "data_categories", length = 500)
    private String dataCategories;

    @Column(name = "detected_at")
    private OffsetDateTime detectedAt;

    @Column(name = "severity", length = 10)
    private String severity;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "OPEN";

    @Column(name = "dpdp_deadline")
    private OffsetDateTime dpdpDeadline;

    @Column(name = "cert_in_deadline")
    private OffsetDateTime certInDeadline;

    @Column(name = "notified_authorities_at")
    private OffsetDateTime notifiedAuthoritiesAt;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
