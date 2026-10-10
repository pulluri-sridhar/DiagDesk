package com.diagdesk.reporting.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "report_deliveries", schema = "reporting")
@Getter @Setter @NoArgsConstructor
public class ReportDelivery {

    @Id
    @Column(name = "delivery_id")
    private String deliveryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Channel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeliveryStatus status = DeliveryStatus.QUEUED;

    @Column(name = "recipient_id")
    private String recipientId;

    @Column(name = "recipient_type")
    private String recipientType;

    @Column(name = "queued_at")
    private Instant queuedAt = Instant.now();

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "failure_reason")
    private String failureReason;

    public enum Channel { WHATSAPP, SMS, EMAIL }
    public enum DeliveryStatus { QUEUED, SENT, DELIVERED, FAILED }
}
