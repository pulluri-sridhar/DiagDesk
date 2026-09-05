package com.diagdesk.notification.service;

import com.diagdesk.notification.dto.request.SendNotificationRequest;
import com.diagdesk.notification.dto.response.DeliveryStatsResponse;
import com.diagdesk.notification.dto.response.NotificationResponse;

import java.util.List;

public interface NotificationService {

    NotificationResponse send(SendNotificationRequest req);

    NotificationResponse getById(String notificationId);

    List<NotificationResponse> list(String recipientId, String channel, String status, int page, int size);

    NotificationResponse retry(String notificationId);

    DeliveryStatsResponse deliveryStats(String channel, String period);
}
