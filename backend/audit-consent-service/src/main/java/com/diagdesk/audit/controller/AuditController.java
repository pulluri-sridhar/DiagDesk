package com.diagdesk.audit.controller;

import com.diagdesk.audit.dto.response.AuditEventResponse;
import com.diagdesk.audit.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping("/v1/audit-events")
    @PreAuthorize("hasAuthority('audit.view')")
    public ResponseEntity<Page<AuditEventResponse>> queryEvents(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) String actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(auditService.queryEvents(entityType, entityId, actorId, action, from, to, page, size));
    }

    @GetMapping("/v1/audit-events/{eventId}")
    @PreAuthorize("hasAuthority('audit.view')")
    public ResponseEntity<AuditEventResponse> getById(@PathVariable String eventId) {
        return ResponseEntity.ok(auditService.getById(eventId));
    }

    @GetMapping("/v1/audit-events/patient/{patientId}")
    @PreAuthorize("hasAuthority('audit.view')")
    public ResponseEntity<List<AuditEventResponse>> getByPatient(@PathVariable String patientId) {
        return ResponseEntity.ok(auditService.getByPatient(patientId));
    }

    @PostMapping("/v1/audit/verify-chain")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> verifyChain(@RequestBody Map<String, OffsetDateTime> req) {
        return ResponseEntity.ok(auditService.verifyChain(req.get("from"), req.get("to")));
    }
}
