package com.diagdesk.result.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "critical_acknowledgements", schema = "results")
@Getter @Setter @NoArgsConstructor
public class CriticalAcknowledgement {

    @Id
    @Column(name = "acknowledgement_id")
    private String acknowledgementId;

    @Column(name = "result_id", nullable = false)
    private String resultId;

    @Column(name = "called_at")
    private LocalDateTime calledAt;

    @Column(name = "called_to_phone", length = 20)
    private String calledToPhone;

    @Column(name = "caller_id")
    private String callerId;

    @Column(name = "response_notes", length = 500)
    private String responseNotes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
