package com.diagdesk.audit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "consents", schema = "audit")
@Getter
@Setter
public class Consent {

    public enum ConsentType { DATA_PROCESSING, MARKETING, RESEARCH }
    public enum ConsentStatus { ACTIVE, REVOKED }

    @Id
    @Column(name = "consent_id", length = 36)
    private String consentId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "patient_id", nullable = false, length = 36)
    private String patientId;

    @Enumerated(EnumType.STRING)
    @Column(name = "consent_type", nullable = false, length = 30)
    private ConsentType consentType;

    @Column(name = "purpose", length = 200)
    private String purpose;

    @Column(name = "language_code", length = 5)
    private String languageCode = "en";

    @Column(name = "consent_text_version", length = 20)
    private String consentTextVersion;

    @Column(name = "captured_via", length = 20)
    private String capturedVia;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private ConsentStatus status = ConsentStatus.ACTIVE;

    @Column(name = "captured_at", nullable = false)
    private OffsetDateTime capturedAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    @Column(name = "revoked_by", length = 36)
    private String revokedBy;

    @Column(name = "hash", length = 64)
    private String hash;

    @PrePersist
    void onCreate() {
        if (capturedAt == null) capturedAt = OffsetDateTime.now();
    }
}
