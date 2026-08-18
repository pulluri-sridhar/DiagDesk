package com.diagdesk.audit.service;

import com.diagdesk.audit.dto.response.AuditEventResponse;
import com.diagdesk.audit.entity.AuditEvent;
import com.diagdesk.audit.repository.AuditEventRepository;
import com.diagdesk.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditServiceImpl implements AuditService {

    private final AuditEventRepository auditEventRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<AuditEventResponse> queryEvents(String entityType, String entityId, String actorId,
                                                String action, OffsetDateTime from, OffsetDateTime to,
                                                int page, int size) {
        String tenantId = TenantContext.getTenantId();
        if (entityType != null && entityId != null) {
            return auditEventRepository.findByTenantIdAndEntityTypeAndEntityId(
                    tenantId, entityType, entityId, PageRequest.of(page, size))
                    .map(this::toResponse);
        }
        return auditEventRepository.findByTenantId(tenantId, PageRequest.of(page, size))
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public AuditEventResponse getById(String eventId) {
        return auditEventRepository.findById(eventId)
                .map(this::toResponse)
                .orElseThrow(() -> new IllegalArgumentException("Audit event not found: " + eventId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditEventResponse> getByPatient(String patientId) {
        String tenantId = TenantContext.getTenantId();
        return auditEventRepository.findByTenantIdAndEntityIdOrderByTimestampAsc(tenantId, patientId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> verifyChain(OffsetDateTime from, OffsetDateTime to) {
        String tenantId = TenantContext.getTenantId();
        List<AuditEvent> events = auditEventRepository
                .findByTenantIdAndTimestampBetweenOrderByTimestampAsc(tenantId, from, to);

        boolean chainValid = true;
        String firstBrokenEventId = null;
        String prevChainHash = "GENESIS";

        for (AuditEvent event : events) {
            String expectedChainHash = sha256(prevChainHash + event.getPayloadHash());
            if (!expectedChainHash.equals(event.getChainHash())) {
                chainValid = false;
                firstBrokenEventId = event.getEventId();
                break;
            }
            prevChainHash = event.getChainHash();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("chain_valid", chainValid);
        result.put("events_checked", events.size());
        result.put("first_broken_event_id", firstBrokenEventId);
        return result;
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

    private AuditEventResponse toResponse(AuditEvent e) {
        AuditEventResponse r = new AuditEventResponse();
        r.setEventId(e.getEventId());
        r.setTenantId(e.getTenantId());
        r.setEntityType(e.getEntityType());
        r.setEntityId(e.getEntityId());
        r.setAction(e.getAction());
        r.setActorId(e.getActorId());
        r.setActorRole(e.getActorRole());
        r.setPayloadHash(e.getPayloadHash());
        r.setChainHash(e.getChainHash());
        r.setBranchId(e.getBranchId());
        r.setTimestamp(e.getTimestamp());
        return r;
    }
}
