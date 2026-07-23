package com.diagdesk.common.audit;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;

/**
 * Immutable audit event published to Kafka topic diagdesk.audit.events.
 *
 * Consumed by Service 9 (Audit & Consent) which:
 *  - Appends events to the hash-chained immutable audit log (NABL tamper-evidence)
 *  - Makes them queryable via GET /v1/audit-events
 *
 * payloadHash is SHA-256 of the JSON payload, allowing offline integrity verification.
 */
@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuditEvent {
    String eventId;
    String entityType;   // patient | order | result | report | invoice | user
    String entityId;
    String action;       // e.g. patient.registered, result.validate, report.signoff
    String actorId;
    String actorRole;
    String tenantId;
    String branchId;
    String payloadJson;
    String payloadHash;  // sha256 of payloadJson for tamper-evidence
    Instant timestamp;
}
