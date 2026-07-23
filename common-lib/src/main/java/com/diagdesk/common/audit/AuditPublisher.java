package com.diagdesk.common.audit;

import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;

/**
 * Publishes immutable audit events asynchronously to Kafka.
 *
 * @Async keeps audit publishing off the critical request path.
 * Kafka producer is configured with acks=all + idempotence so events
 * are not lost on broker restart.
 *
 * Service 9 (Audit & Consent) consumes these and builds the hash-chain.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditPublisher {

    static final String TOPIC = "diagdesk.audit.events";

    private final KafkaTemplate<String, AuditEvent> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Async
    public void publish(String entityType, String entityId, String action, Object payload) {
        try {
            String payloadJson = objectMapper.writeValueAsString(payload);
            String payloadHash = sha256(payloadJson);

            AuditEvent event = AuditEvent.builder()
                    .eventId(UUIDv7.generateAsString())
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .actorId(TenantContext.getUserId())
                    .tenantId(TenantContext.getTenantId())
                    .branchId(TenantContext.getBranchId())
                    .payloadJson(payloadJson)
                    .payloadHash(payloadHash)
                    .timestamp(Instant.now())
                    .build();

            kafkaTemplate.send(TOPIC, entityId, event)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("Audit event delivery failed entity={} action={}", entityId, action, ex);
                        }
                    });
        } catch (Exception e) {
            log.error("Audit publish error entity={} action={}", entityId, action, e);
        }
    }

    private String sha256(String input) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return "hash-unavailable";
        }
    }
}
