package com.diagdesk.analytics.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "alert_records", schema = "analytics")
@Getter
@Setter
public class AlertRecord {

    @Id
    @Column(name = "alert_id", length = 36)
    private String alertId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "type", nullable = false, length = 50)
    private String type;

    @Column(name = "severity", length = 10)
    private String severity;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "triggered_at", nullable = false)
    private OffsetDateTime triggeredAt;

    @Column(name = "acknowledged", nullable = false)
    private boolean acknowledged = false;

    @Column(name = "acknowledged_at")
    private OffsetDateTime acknowledgedAt;

    @Column(name = "acknowledged_by", length = 36)
    private String acknowledgedBy;
}
