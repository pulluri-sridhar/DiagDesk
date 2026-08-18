package com.diagdesk.audit.service;

import com.diagdesk.audit.dto.response.AuditEventResponse;
import org.springframework.data.domain.Page;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public interface AuditService {

    Page<AuditEventResponse> queryEvents(String entityType, String entityId, String actorId,
                                         String action, OffsetDateTime from, OffsetDateTime to,
                                         int page, int size);

    AuditEventResponse getById(String eventId);

    List<AuditEventResponse> getByPatient(String patientId);

    Map<String, Object> verifyChain(OffsetDateTime from, OffsetDateTime to);
}
