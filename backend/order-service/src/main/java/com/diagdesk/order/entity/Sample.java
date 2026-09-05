package com.diagdesk.order.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(
    name = "samples",
    schema = "orders",
    indexes = {
        @Index(name = "idx_sample_order",     columnList = "order_id"),
        @Index(name = "idx_sample_tenant",    columnList = "tenant_id"),
        @Index(name = "idx_sample_accession", columnList = "accession_number", unique = true),
        @Index(name = "idx_sample_status",    columnList = "tenant_id, status")
    }
)
@Getter @Setter @NoArgsConstructor
public class Sample extends BaseEntity {

    @Id
    @Column(name = "accession_id", length = 36, updatable = false)
    private String accessionId;

    @Column(name = "accession_number", length = 20, nullable = false, unique = true)
    private String accessionNumber;

    @Column(name = "barcode", length = 20, nullable = false)
    private String barcode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "patient_id", length = 36, nullable = false)
    private String patientId;

    @Column(name = "specimen_type", length = 100)
    private String specimenType;

    @Column(name = "container", length = 100)
    private String container;

    @Column(name = "collected_by", length = 36)
    private String collectedBy;

    @Column(name = "collected_at")
    private Instant collectedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "collection_location", length = 20)
    private CollectionLocation collectionLocation;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 15, nullable = false)
    private SampleStatus status = SampleStatus.collected;

    @Column(name = "received_at")
    private Instant receivedAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "reported_at")
    private Instant reportedAt;

    @Column(name = "handed_over_at")
    private Instant handedOverAt;

    @Column(name = "tat_deadline")
    private Instant tatDeadline;

    @Column(name = "tat_breached")
    private boolean tatBreached = false;

    @Column(name = "notes", length = 500)
    private String notes;

    public enum SampleStatus {
        collected, received, in_process, processed, reported, rejected, handed_over
    }

    public enum CollectionLocation { counter, home, b2b_site }
}
