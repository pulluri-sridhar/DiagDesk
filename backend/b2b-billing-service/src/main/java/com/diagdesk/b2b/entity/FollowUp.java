package com.diagdesk.b2b.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "follow_ups", schema = "b2b")
@Getter
@Setter
public class FollowUp {

    public enum ActionType { CALL, EMAIL, VISIT, DEMAND_NOTICE }

    @Id
    @Column(name = "follow_up_id", length = 36)
    private String followUpId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "partner_id", nullable = false, length = 36)
    private String partnerId;

    @Column(name = "invoice_id", length = 36)
    private String invoiceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 20)
    private ActionType actionType;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "next_follow_up_date")
    private LocalDate nextFollowUpDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
