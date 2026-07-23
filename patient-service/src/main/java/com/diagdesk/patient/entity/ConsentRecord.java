package com.diagdesk.patient.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * DPDP consent record — append-only by design.
 *
 * Consent records are never hard-deleted (DPDP audit trail requirement).
 * Revocation sets status="revoked" and records who revoked and when.
 *
 * hash is SHA-256 of (patient_id + consent_type + purpose + version + captured_at)
 * — allows offline tamper-evidence verification by the compliance team.
 */
@Entity
@Table(
    name = "consent_records",
    schema = "patient",
    indexes = {
        @Index(name = "idx_consent_patient_id", columnList = "patient_id"),
        @Index(name = "idx_consent_tenant_id",  columnList = "tenant_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
public class ConsentRecord extends BaseEntity {

    @Id
    @Column(name = "consent_id", length = 36, updatable = false)
    private String consentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false, updatable = false)
    private Patient patient;

    @Column(name = "consent_type", length = 50, nullable = false)
    private String consentType;

    @Column(name = "purpose", length = 255, nullable = false)
    private String purpose;

    @Column(name = "language_code", length = 5)
    private String languageCode;

    @Column(name = "consent_text_version", length = 20, nullable = false)
    private String consentTextVersion;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "captured_via", length = 20)
    private String capturedVia;

    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt;

    /** SHA-256 of the consent payload for tamper-evidence. */
    @Column(name = "hash", length = 64, nullable = false)
    private String hash;

    @Column(name = "status", length = 20, nullable = false)
    private String status = "active";

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_by", length = 36)
    private String revokedBy;
}
