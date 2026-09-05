package com.diagdesk.audit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

import java.time.OffsetDateTime;

@Entity
@Immutable
@Table(name = "audit_events", schema = "audit")
@Getter
@Setter
public class AuditEvent {

    @Id
    @Column(name = "event_id", length = 36)
    private String eventId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "entity_type", length = 30)
    private String entityType;

    @Column(name = "entity_id", length = 36)
    private String entityId;

    @Column(name = "action", length = 100)
    private String action;

    @Column(name = "actor_id", length = 36)
    private String actorId;

    @Column(name = "actor_role", length = 50)
    private String actorRole;

    @Column(name = "payload_hash", length = 64)
    private String payloadHash;

    @Column(name = "chain_hash", length = 64)
    private String chainHash;

    @Column(name = "branch_id", length = 36)
    private String branchId;

    @Column(name = "timestamp", nullable = false)
    private OffsetDateTime timestamp;

    @PrePersist
    void onCreate() {
        if (timestamp == null) timestamp = OffsetDateTime.now();
    }
}
