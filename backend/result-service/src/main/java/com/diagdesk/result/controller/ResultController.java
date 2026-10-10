package com.diagdesk.result.controller;

import com.diagdesk.result.dto.request.*;
import com.diagdesk.result.dto.response.*;
import com.diagdesk.result.service.ResultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ResultController {

    private final ResultService resultService;

    @PostMapping("/v1/results")
    @PreAuthorize("hasAuthority('report.validate') or hasAuthority('ROLE_SYSTEM')")
    public ResponseEntity<ResultResponse> submit(@Valid @RequestBody SubmitResultRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(resultService.submit(req));
    }

    @GetMapping("/v1/results/{resultId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ResultResponse> getById(@PathVariable String resultId) {
        return ResponseEntity.ok(resultService.getById(resultId));
    }

    @GetMapping("/v1/results")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, List<ResultResponse>>> list(
            @RequestParam(required = false) String accessionId,
            @RequestParam(required = false) String orderId) {
        List<ResultResponse> results = accessionId != null
                ? resultService.listByAccession(accessionId)
                : resultService.listByOrder(orderId);
        return ResponseEntity.ok(Map.of("data", results));
    }

    @PutMapping("/v1/results/{resultId}")
    @PreAuthorize("hasAuthority('report.validate')")
    public ResponseEntity<AmendResultResponse> amend(
            @PathVariable String resultId,
            @Valid @RequestBody AmendResultRequest req) {
        return ResponseEntity.ok(resultService.amend(resultId, req));
    }

    @PostMapping("/v1/results/{resultId}/validate")
    @PreAuthorize("hasAuthority('report.validate')")
    public ResponseEntity<ValidationResponse> validate(
            @PathVariable String resultId,
            @RequestBody(required = false) ValidateResultRequest req) {
        return ResponseEntity.ok(resultService.validate(resultId, req != null ? req : new ValidateResultRequest()));
    }

    @PostMapping("/v1/results/{resultId}/signoff")
    @PreAuthorize("hasAuthority('report.signoff')")
    public ResponseEntity<SignoffResponse> signoff(
            @PathVariable String resultId,
            @Valid @RequestBody SignoffRequest req) {
        return ResponseEntity.ok(resultService.signoff(resultId, req));
    }

    @PostMapping("/v1/results/{resultId}/reject-validation")
    @PreAuthorize("hasAuthority('report.signoff')")
    public ResponseEntity<Map<String, String>> rejectValidation(
            @PathVariable String resultId,
            @Valid @RequestBody RejectValidationRequest req) {
        ResultResponse result = resultService.rejectValidation(resultId, req);
        return ResponseEntity.ok(Map.of("result_id", resultId, "status", result.getValidationStatus()));
    }

    @GetMapping("/v1/results/{resultId}/delta-check")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DeltaCheckResponse> deltaCheck(@PathVariable String resultId) {
        return ResponseEntity.ok(resultService.deltaCheck(resultId));
    }

    @PostMapping("/v1/results/{resultId}/repeat-request")
    @PreAuthorize("hasAuthority('report.validate')")
    public ResponseEntity<RepeatRequestResponse> requestRepeat(
            @PathVariable String resultId,
            @Valid @RequestBody RepeatRequestRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(resultService.requestRepeat(resultId, req));
    }

    @GetMapping("/v1/results/pending-validation")
    @PreAuthorize("hasAuthority('report.validate') or hasAuthority('report.signoff')")
    public ResponseEntity<Map<String, List<ResultResponse>>> getPendingValidation(
            @RequestParam(name = "branch_id", required = false) String branchId,
            @RequestParam(required = false) Integer level,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(Map.of("data", resultService.getPendingValidation(branchId, level, page, size)));
    }

    @GetMapping("/v1/results/critical-alerts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, List<CriticalAlertResponse>>> getCriticalAlerts() {
        return ResponseEntity.ok(Map.of("data", resultService.getCriticalAlerts()));
    }

    @PostMapping("/v1/results/{resultId}/acknowledge-critical")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AcknowledgementResponse> acknowledgeCritical(
            @PathVariable String resultId,
            @Valid @RequestBody AcknowledgeCriticalRequest req) {
        return ResponseEntity.ok(resultService.acknowledgeCritical(resultId, req));
    }

    @GetMapping("/v1/results/{resultId}/audit-trail")
    @PreAuthorize("hasAuthority('audit.view')")
    public ResponseEntity<Map<String, List<AuditEventResponse>>> getAuditTrail(@PathVariable String resultId) {
        return ResponseEntity.ok(Map.of("events", resultService.getAuditTrail(resultId)));
    }
}
