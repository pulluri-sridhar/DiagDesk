package com.diagdesk.reporting.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "print_logs", schema = "reporting")
@Getter @Setter @NoArgsConstructor
public class PrintLog {

    @Id
    @Column(name = "print_log_id")
    private String printLogId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @Column(nullable = false)
    private Integer copies = 1;

    @Column(name = "printed_by")
    private String printedBy;

    @Column(name = "printer_id")
    private String printerId;

    @Column(name = "printed_at", nullable = false)
    private Instant printedAt = Instant.now();
}
