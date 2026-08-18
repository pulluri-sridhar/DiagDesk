package com.diagdesk.audit.kafka;

import com.diagdesk.audit.entity.AuditEvent;
import com.diagdesk.audit.repository.AuditEventRepository;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuditEventConsumer {

    private final AuditEventRepository auditEventRepository;

    @KafkaListener(topics = "audit.events", groupId = "audit-service")
    public void onAuditEvent(ConsumerRecord<String, Map<String, Object>> record) {
        Map<String, Object> event = record.value();
        String tenantId = (String) event.get("tenant_id");
        if (tenantId == null) {
            log.warn("Received audit event without tenant_id, skipping");
            return;
        }

        String payloadHash = sha256(event.toString());
        Optional<AuditEvent> lastEvent = auditEventRepository.findTopByTenantIdOrderByTimestampDesc(tenantId);
        String prevChainHash = lastEvent.map(AuditEvent::getChainHash).orElse("GENESIS");
        String chainHash = sha256(prevChainHash + payloadHash);

        AuditEvent auditEvent = new AuditEvent();
        auditEvent.setEventId(UUIDv7.generate());
        auditEvent.setTenantId(tenantId);
        auditEvent.setEntityType((String) event.get("entity_type"));
        auditEvent.setEntityId((String) event.get("entity_id"));
        auditEvent.setAction((String) event.get("action"));
        auditEvent.setActorId((String) event.get("actor_id"));
        auditEvent.setActorRole((String) event.get("actor_role"));
        auditEvent.setBranchId((String) event.get("branch_id"));
        auditEvent.setPayloadHash(payloadHash);
        auditEvent.setChainHash(chainHash);
        auditEvent.setTimestamp(OffsetDateTime.now());

        auditEventRepository.save(auditEvent);
        log.debug("Audit event persisted: {} action={}", auditEvent.getEventId(), auditEvent.getAction());
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
