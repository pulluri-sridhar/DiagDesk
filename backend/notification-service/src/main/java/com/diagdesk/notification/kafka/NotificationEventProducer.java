package com.diagdesk.notification.kafka;

import com.diagdesk.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publish(Notification notification, Map<String, String> variables) {
        Map<String, Object> event = new HashMap<>();
        event.put("notification_id", notification.getNotificationId());
        event.put("channel", notification.getChannel().name());
        event.put("recipient_id", notification.getRecipientId());
        event.put("recipient_type", notification.getRecipientType());
        event.put("template_id", notification.getTemplateId());
        event.put("tenant_id", notification.getTenantId());
        if (variables != null) event.put("variables", variables);
        kafkaTemplate.send("notification.send", notification.getNotificationId(), event);
        log.info("Notification event published: {}", notification.getNotificationId());
    }
}
