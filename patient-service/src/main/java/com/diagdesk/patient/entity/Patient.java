package com.diagdesk.patient.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Patient master record — the anchor entity of Service 1.
 *
 * Multi-tenancy: tenant_id (BaseEntity) is the partition key.
 *   Application layer always scopes queries by tenant_id.
 *   Postgres RLS policy provides an additional DB-layer safety net.
 *
 * Soft-delete: @SQLRestriction filters out deleted rows transparently.
 *   Historical orders reference patient_id and remain readable via direct joins.
 *
 * MPI dedup: first_name_soundex / last_name_soundex are pre-computed at write
 *   time so dedup searches are index-only scans, not full-table LIKE queries.
 *
 * Allergies: stored as JSONB (Hibernate 6 @JdbcTypeCode) so Postgres can index
 *   and query them while the Java type stays a plain List<String>.
 */
@Entity
@Table(
    name = "patients",
    schema = "patient",
    indexes = {
        @Index(name = "idx_patients_tenant_id",  columnList = "tenant_id"),
        @Index(name = "idx_patients_phone",       columnList = "phone"),
        @Index(name = "idx_patients_uhid",        columnList = "uhid",   unique = true),
        @Index(name = "idx_patients_soundex",     columnList = "first_name_soundex, last_name_soundex"),
        @Index(name = "idx_patients_dob",         columnList = "date_of_birth")
    }
)
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
public class Patient extends BaseEntity {

    @Id
    @Column(name = "patient_id", length = 36, updatable = false)
    private String patientId;

    @Column(name = "uhid", length = 20, nullable = false, unique = true)
    private String uhid;

    @Column(name = "first_name", length = 100, nullable = false)
    private String firstName;

    @Column(name = "last_name", length = 100, nullable = false)
    private String lastName;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 10, nullable = false)
    private Gender gender;

    @Column(name = "phone", length = 20, nullable = false)
    private String phone;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "address_line1", length = 255)
    private String addressLine1;

    @Column(name = "address_city", length = 100)
    private String addressCity;

    @Column(name = "address_state", length = 100)
    private String addressState;

    @Column(name = "address_pincode", length = 6)
    private String addressPincode;

    /** Stored masked — already the last 4 digits, never the full number. */
    @Column(name = "aadhaar_last4", length = 4)
    private String aadhaarLast4;

    @Column(name = "blood_group", length = 5)
    private String bloodGroup;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "allergies", columnDefinition = "jsonb")
    private List<String> allergies = new ArrayList<>();

    @Column(name = "referred_by_doctor_id", length = 36)
    private String referredByDoctorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "consent_status", length = 20, nullable = false)
    private ConsentStatus consentStatus = ConsentStatus.pending;

    /** Pre-computed Soundex code for MPI phonetic dedup. */
    @Column(name = "first_name_soundex", length = 10)
    private String firstNameSoundex;

    @Column(name = "last_name_soundex", length = 10)
    private String lastNameSoundex;

    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ConsentRecord> consentRecords = new ArrayList<>();

    // ── Enums ─────────────────────────────────────────────────────────────────

    public enum Gender { male, female, other }

    public enum ConsentStatus { obtained, pending, revoked }
}
