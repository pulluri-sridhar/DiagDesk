package com.diagdesk.notification.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

import java.time.OffsetDateTime;

@Entity
@Table(name = "notifications", schema = "notifications")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
public class Notification extends BaseEntity {

    public enum Channel { WHATSAPP, SMS, EMAIL }
    public enum NotificationStatus { QUEUED, SENT, DELIVERED, FAILED, BOUNCED }

    @Id
    @Column(name = "notification_id", length = 36)
    private String notificationId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "recipient_type", length = 20)
    private String recipientType;

    @Column(name = "recipient_id", length = 36)
    private String recipientId;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 10)
    private Channel channel;

    @Column(name = "template_id", length = 36)
    private String templateId;

    @Column(name = "variables", columnDefinition = "TEXT")
    private String variables;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private NotificationStatus status = NotificationStatus.QUEUED;

    @Column(name = "queued_at", nullable = false)
    private OffsetDateTime queuedAt;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;

    @Column(name = "delivered_at")
    private OffsetDateTime deliveredAt;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0;

    @PrePersist
    void onCreate() {
        if (queuedAt == null) queuedAt = OffsetDateTime.now();
    }
}
