package com.diagdesk.notification.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class NotificationResponse {
    private String notificationId;
    private String tenantId;
    private String recipientType;
    private String recipientId;
    private String channel;
    private String templateId;
    private String variables;
    private String status;
    private OffsetDateTime queuedAt;
    private OffsetDateTime sentAt;
    private OffsetDateTime deliveredAt;
    private String failureReason;
    private int retryCount;
}
