package com.diagdesk.patient.controller;

import com.diagdesk.common.dto.PageResponse;
import com.diagdesk.patient.dto.request.ConsentRequest;
import com.diagdesk.patient.dto.request.DedupCheckRequest;
import com.diagdesk.patient.dto.request.RegisterPatientRequest;
import com.diagdesk.patient.dto.response.*;
import com.diagdesk.patient.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST adapter for the Patient bounded context.
 * Base path: /v1/patients  | Port: 8081
 *
 * All endpoints:
 *  - Require a valid Keycloak JWT (enforced by SecurityConfig)
 *  - Enforce fine-grained permissions via @PreAuthorize (OPA-style RBAC)
 *  - Accept X-Idempotency-Key on all state-changing operations
 *  - Return standard PageResponse / ErrorResponse envelopes (from common-lib)
 *
 * This controller contains zero business logic — it is a thin HTTP adapter.
 */
@RestController
@RequestMapping("/v1/patients")
@RequiredArgsConstructor
public class PatientController {

    private static final String IDEMPOTENCY_HEADER = "X-Idempotency-Key";

    private final PatientService patientService;

    // ── POST /v1/patients ─────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('registration.create')")
    public ResponseEntity<RegisterPatientResponse> register(
            @Valid @RequestBody RegisterPatientRequest request,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {

        RegisterPatientResponse response = patientService.register(request, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── GET /v1/patients/{patientId} ──────────────────────────────────────────

    @GetMapping("/{patientId}")
    @PreAuthorize("hasAuthority('registration.create')")
    public ResponseEntity<PatientResponse> getById(@PathVariable String patientId) {
        return ResponseEntity.ok(patientService.getById(patientId));
    }

    // ── GET /v1/patients?q=&branch_id=&page=&size= ────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('registration.create')")
    public ResponseEntity<PageResponse<PatientSummaryResponse>> search(
            @RequestParam(required = false) String q,
            @RequestParam(name = "branch_id", required = false) String branchId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return ResponseEntity.ok(patientService.search(q, branchId, page, size));
    }

    // ── PUT /v1/patients/{patientId} ──────────────────────────────────────────

    @PutMapping("/{patientId}")
    @PreAuthorize("hasAuthority('registration.create')")
    public ResponseEntity<PatientResponse> update(
            @PathVariable String patientId,
            @Valid @RequestBody RegisterPatientRequest request,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {

        return ResponseEntity.ok(patientService.update(patientId, request));
    }

    // ── POST /v1/patients/dedup-check ─────────────────────────────────────────

    @PostMapping("/dedup-check")
    @PreAuthorize("hasAuthority('registration.create')")
    public ResponseEntity<DedupCheckResponse> dedupCheck(
            @Valid @RequestBody DedupCheckRequest request) {

        return ResponseEntity.ok(patientService.dedupCheck(request));
    }

    // ── POST /v1/patients/{patientId}/consent ─────────────────────────────────

    @PostMapping("/{patientId}/consent")
    @PreAuthorize("hasAuthority('registration.create')")
    public ResponseEntity<ConsentResponse> captureConsent(
            @PathVariable String patientId,
            @Valid @RequestBody ConsentRequest request,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {

        ConsentResponse response = patientService.captureConsent(patientId, request, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── GET /v1/patients/{patientId}/consent ──────────────────────────────────

    @GetMapping("/{patientId}/consent")
    @PreAuthorize("hasAuthority('audit.view')")
    public ResponseEntity<List<ConsentResponse>> getConsents(@PathVariable String patientId) {
        return ResponseEntity.ok(patientService.getConsents(patientId));
    }
}
