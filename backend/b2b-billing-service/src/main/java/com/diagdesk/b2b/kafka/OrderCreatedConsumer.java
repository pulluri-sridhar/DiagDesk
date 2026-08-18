package com.diagdesk.b2b.kafka;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Slf4j
public class OrderCreatedConsumer {

    @KafkaListener(topics = "order.created", groupId = "b2b-service")
    public void onOrderCreated(ConsumerRecord<String, Map<String, Object>> record) {
        Map<String, Object> event = record.value();
        String partnerId = (String) event.get("b2b_partner_id");
        if (partnerId == null) return;

        log.info("B2B order received for partnerId={}, orderId={}", partnerId, event.get("order_id"));
    }
}
