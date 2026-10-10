package com.diagdesk.analytics.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "digest_subscriptions", schema = "analytics")
@Getter
@Setter
public class DigestSubscription {

    @Id
    @Column(name = "subscription_id", length = 36)
    private String subscriptionId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(name = "frequency", length = 10)
    private String frequency;

    @Column(name = "channels", length = 100)
    private String channels;

    @Column(name = "send_time", length = 5)
    private String sendTime;

    @Column(name = "timezone", length = 50)
    private String timezone;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
