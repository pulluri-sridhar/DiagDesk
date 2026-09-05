package com.diagdesk.audit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "data_subject_requests", schema = "audit")
@Getter
@Setter
public class DataSubjectRequest {

    public enum RequestType { ACCESS, ERASURE, PORTABILITY, CORRECTION }
    public enum DsrStatus { RECEIVED, IN_PROGRESS, COMPLETED, OVERDUE }

    @Id
    @Column(name = "dsr_id", length = 36)
    private String dsrId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "patient_id", nullable = false, length = 36)
    private String patientId;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 20)
    private RequestType requestType;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DsrStatus status = DsrStatus.RECEIVED;

    @Column(name = "received_at", nullable = false)
    private OffsetDateTime receivedAt;

    @Column(name = "estimated_completion")
    private OffsetDateTime estimatedCompletion;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @PrePersist
    void onCreate() {
        if (receivedAt == null) receivedAt = OffsetDateTime.now();
    }
}
