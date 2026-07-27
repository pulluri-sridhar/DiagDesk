package com.diagdesk.result.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "result_amendments", schema = "results")
@Getter @Setter @NoArgsConstructor
public class ResultAmendment {

    @Id
    @Column(name = "amendment_id")
    private String amendmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "result_id", nullable = false)
    private TestResult result;

    @Column(name = "previous_value", nullable = false)
    private String previousValue;

    @Column(name = "new_value", nullable = false)
    private String newValue;

    @Column(name = "amendment_reason", length = 500)
    private String amendmentReason;

    @Column(name = "amended_by")
    private String amendedBy;

    @Column(name = "amended_at", nullable = false)
    private LocalDateTime amendedAt;

    @Column(nullable = false)
    private Integer version;
}
