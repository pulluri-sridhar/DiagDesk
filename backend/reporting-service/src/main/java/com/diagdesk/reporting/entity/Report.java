package com.diagdesk.reporting.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "reports", schema = "reporting")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor
public class Report extends BaseEntity {

    @Id
    @Column(name = "report_id")
    private String reportId;

    @Column(name = "order_id", nullable = false)
    private String orderId;

    @Column(name = "patient_id", nullable = false)
    private String patientId;

    @Column(name = "branch_id", nullable = false)
    private String branchId;

    @Column(name = "template_id")
    private String templateId;

    @Column(name = "letterhead_id")
    private String letterheadId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status = ReportStatus.DRAFT;

    @Column(nullable = false)
    private Integer version = 1;

    @Column(name = "clinical_notes", columnDefinition = "TEXT")
    private String clinicalNotes;

    @Column(name = "interpretation", columnDefinition = "TEXT")
    private String interpretation;

    @Column(name = "signed_by")
    private String signedBy;

    @Column(name = "signed_at")
    private Instant signedAt;

    @Column(name = "pdf_storage_key")
    private String pdfStorageKey;

    @Column(name = "print_count", nullable = false)
    private Integer printCount = 0;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ReportDelivery> deliveries = new ArrayList<>();

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("printedAt ASC")
    private List<PrintLog> printLogs = new ArrayList<>();

    public enum ReportStatus {
        DRAFT, PENDING_SIGNOFF, SIGNED_OFF, DELIVERED, AMENDED
    }
}
