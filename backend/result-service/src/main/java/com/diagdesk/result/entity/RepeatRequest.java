package com.diagdesk.result.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "repeat_requests", schema = "results")
@Getter @Setter @NoArgsConstructor
public class RepeatRequest {

    @Id
    @Column(name = "repeat_request_id")
    private String repeatRequestId;

    @Column(name = "result_id", nullable = false)
    private String resultId;

    @Column(length = 500)
    private String reason;

    private String priority; // routine, urgent, stat

    @Column(name = "requested_by")
    private String requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RepeatStatus status = RepeatStatus.PENDING;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public enum RepeatStatus { PENDING, IN_PROGRESS, COMPLETED, CANCELLED }
}
