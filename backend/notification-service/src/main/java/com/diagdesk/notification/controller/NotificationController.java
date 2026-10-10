package com.diagdesk.notification.controller;

import com.diagdesk.notification.dto.request.SendNotificationRequest;
import com.diagdesk.notification.dto.response.DeliveryStatsResponse;
import com.diagdesk.notification.dto.response.NotificationResponse;
import com.diagdesk.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping("/v1/notifications/send")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationResponse> send(@Valid @RequestBody SendNotificationRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(notificationService.send(req));
    }

    @GetMapping("/v1/notifications/{notificationId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationResponse> getById(@PathVariable String notificationId) {
        return ResponseEntity.ok(notificationService.getById(notificationId));
    }

    @GetMapping("/v1/notifications")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NotificationResponse>> list(
            @RequestParam(required = false) String recipientId,
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(notificationService.list(recipientId, channel, status, page, size));
    }

    @PostMapping("/v1/notifications/{notificationId}/retry")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationResponse> retry(@PathVariable String notificationId) {
        return ResponseEntity.ok(notificationService.retry(notificationId));
    }

    @GetMapping("/v1/notifications/delivery-stats")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DeliveryStatsResponse> deliveryStats(
            @RequestParam String channel,
            @RequestParam(defaultValue = "30d") String period) {
        return ResponseEntity.ok(notificationService.deliveryStats(channel, period));
    }
}
