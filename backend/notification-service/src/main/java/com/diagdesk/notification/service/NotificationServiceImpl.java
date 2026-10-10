package com.diagdesk.notification.service;

import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import com.diagdesk.notification.dto.request.SendNotificationRequest;
import com.diagdesk.notification.dto.response.DeliveryStatsResponse;
import com.diagdesk.notification.dto.response.NotificationResponse;
import com.diagdesk.notification.entity.Notification;
import com.diagdesk.notification.gateway.GatewayDispatcher;
import com.diagdesk.notification.kafka.NotificationEventProducer;
import com.diagdesk.notification.repository.NotificationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationEventProducer eventProducer;
    private final GatewayDispatcher gatewayDispatcher;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public NotificationResponse send(SendNotificationRequest req) {
        Notification n = new Notification();
        n.setNotificationId(UUIDv7.generateAsString());
        n.setTenantId(TenantContext.getTenantId());
        n.setRecipientType(req.getRecipientType());
        n.setRecipientId(req.getRecipientId());
        n.setChannel(Notification.Channel.valueOf(req.getChannel().toUpperCase()));
        n.setTemplateId(req.getTemplateId());
        n.setStatus(Notification.NotificationStatus.QUEUED);

        if (req.getVariables() != null) {
            try {
                n.setVariables(objectMapper.writeValueAsString(req.getVariables()));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize variables", e);
            }
        }

        notificationRepository.save(n);
        eventProducer.publish(n, req.getVariables());
        log.info("Notification queued notificationId={}", n.getNotificationId());

        // Dispatch to MSG91 — failure is non-blocking (status updated to FAILED in DB)
        gatewayDispatcher.dispatch(n);

        return toResponse(n);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationResponse getById(String notificationId) {
        return notificationRepository.findById(notificationId)
                .map(this::toResponse)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Notification not found: " + notificationId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> list(String recipientId, String channel, String status, int page, int size) {
        return notificationRepository
                .findByRecipientId(recipientId, PageRequest.of(page, size))
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public NotificationResponse retry(String notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Notification not found: " + notificationId));
        n.setStatus(Notification.NotificationStatus.QUEUED);
        n.setRetryCount(n.getRetryCount() + 1);
        n.setFailureReason(null);
        notificationRepository.save(n);
        eventProducer.publish(n, null);
        gatewayDispatcher.dispatch(n);
        return toResponse(n);
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryStatsResponse deliveryStats(String channel, String period) {
        Notification.Channel ch = Notification.Channel.valueOf(channel.toUpperCase());
        OffsetDateTime from = OffsetDateTime.now().minusDays(30);
        OffsetDateTime to   = OffsetDateTime.now();

        long sent      = notificationRepository.countByChannelAndStatusAndQueuedAtBetween(
                ch, Notification.NotificationStatus.SENT, from, to);
        long delivered = notificationRepository.countByChannelAndStatusAndQueuedAtBetween(
                ch, Notification.NotificationStatus.DELIVERED, from, to);
        long failed    = notificationRepository.countByChannelAndStatusAndQueuedAtBetween(
                ch, Notification.NotificationStatus.FAILED, from, to);
        long pending   = notificationRepository.countByChannelAndStatusAndQueuedAtBetween(
                ch, Notification.NotificationStatus.QUEUED, from, to);

        DeliveryStatsResponse resp = new DeliveryStatsResponse();
        resp.setChannel(channel);
        resp.setSent(sent);
        resp.setDelivered(delivered);
        resp.setFailed(failed);
        resp.setPending(pending);
        long total = sent + delivered + failed;
        resp.setDeliveryRatePct(total > 0 ? (double) delivered / total * 100.0 : 0.0);
        return resp;
    }

    private NotificationResponse toResponse(Notification n) {
        NotificationResponse r = new NotificationResponse();
        r.setNotificationId(n.getNotificationId());
        r.setTenantId(n.getTenantId());
        r.setRecipientType(n.getRecipientType());
        r.setRecipientId(n.getRecipientId());
        r.setChannel(n.getChannel().name());
        r.setTemplateId(n.getTemplateId());
        r.setVariables(n.getVariables());
        r.setStatus(n.getStatus().name());
        r.setQueuedAt(n.getQueuedAt());
        r.setSentAt(n.getSentAt());
        r.setDeliveredAt(n.getDeliveredAt());
        r.setFailureReason(n.getFailureReason());
        r.setRetryCount(n.getRetryCount());
        return r;
    }
}
