package com.diagdesk.order.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "sample_rejections", schema = "orders")
@Getter @Setter @NoArgsConstructor
public class SampleRejection {

    @Id
    @Column(name = "rejection_id", length = 36, updatable = false)
    private String rejectionId;

    @Column(name = "accession_id", length = 36, nullable = false)
    private String accessionId;

    @Column(name = "rejection_reason_code", length = 30, nullable = false)
    private String rejectionReasonCode;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "re_collection_required", nullable = false)
    private boolean reCollectionRequired;

    @Column(name = "rejected_at", nullable = false)
    private Instant rejectedAt;

    @Column(name = "rejected_by", length = 36)
    private String rejectedBy;
}
