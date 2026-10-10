package com.diagdesk.result.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "test_results", schema = "results")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor
@ToString(exclude = {"amendments", "validations", "signoffs"})
public class TestResult extends BaseEntity {

    @Id
    @Column(name = "result_id")
    private String resultId;

    @Column(name = "accession_id", nullable = false)
    private String accessionId;

    @Column(name = "test_id", nullable = false)
    private String testId;

    @Column(name = "order_id", nullable = false)
    private String orderId;

    @Column(name = "patient_id", nullable = false)
    private String patientId;

    @Column(name = "branch_id", nullable = false)
    private String branchId;

    @Column(nullable = false)
    private String value;

    private String unit;
    private String method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResultSource source;

    @Column(name = "entered_by")
    private String enteredBy;

    @Column(name = "raw_hl7_segment", columnDefinition = "TEXT")
    private String rawHl7Segment;

    // Comma-separated flag codes: H, L, CRITICAL_HIGH, CRITICAL_LOW
    private String flags;

    // Denormalized display string from catalog-service reference range
    @Column(name = "reference_range")
    private String referenceRange;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false)
    private ValidationStatus validationStatus = ValidationStatus.PENDING;

    @Column(nullable = false)
    private Integer version = 1;

    @OneToMany(mappedBy = "result", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("version ASC")
    private List<ResultAmendment> amendments = new ArrayList<>();

    @OneToMany(mappedBy = "result", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("validatedAt ASC")
    private List<ResultValidation> validations = new ArrayList<>();

    @OneToMany(mappedBy = "result", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ResultSignoff> signoffs = new ArrayList<>();

    public enum ResultSource { ANALYZER, MANUAL }

    public enum ValidationStatus {
        PENDING,
        AUTO_VALIDATED,
        PENDING_MANUAL_VALIDATION,
        PENDING_SIGNOFF,
        SIGNED_OFF,
        PENDING_RERUN
    }
}
