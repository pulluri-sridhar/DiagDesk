package com.diagdesk.result.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "result_signoffs", schema = "results")
@Getter @Setter @NoArgsConstructor
public class ResultSignoff {

    @Id
    @Column(name = "signoff_id")
    private String signoffId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "result_id", nullable = false)
    private TestResult result;

    @Enumerated(EnumType.STRING)
    @Column(name = "signature_type")
    private SignatureType signatureType;

    @Column(length = 500)
    private String notes;

    @Column(name = "signed_by")
    private String signedBy;

    @Column(name = "signed_at", nullable = false)
    private LocalDateTime signedAt;

    public enum SignatureType { DIGITAL, PIN }
}
