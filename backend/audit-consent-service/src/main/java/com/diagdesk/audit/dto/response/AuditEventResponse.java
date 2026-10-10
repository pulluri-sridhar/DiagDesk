package com.diagdesk.audit.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class AuditEventResponse {
    private String eventId;
    private String tenantId;
    private String entityType;
    private String entityId;
    private String action;
    private String actorId;
    private String actorRole;
    private String payloadHash;
    private String chainHash;
    private String branchId;
    private OffsetDateTime timestamp;
}
