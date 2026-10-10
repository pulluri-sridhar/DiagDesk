package com.diagdesk.result.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "result_validations", schema = "results")
@Getter @Setter @NoArgsConstructor
public class ResultValidation {

    @Id
    @Column(name = "validation_id")
    private String validationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "result_id", nullable = false)
    private TestResult result;

    @Column(nullable = false)
    private Integer level; // 1 = technician, 2 = pathologist (kept for audit trail)

    @Column(length = 500)
    private String notes;

    @Column(name = "validated_by")
    private String validatedBy;

    @Column(name = "validated_at", nullable = false)
    private LocalDateTime validatedAt;
}
