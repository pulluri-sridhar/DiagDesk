package com.diagdesk.order.controller;

import com.diagdesk.order.dto.request.*;
import com.diagdesk.order.dto.response.*;
import com.diagdesk.order.service.SampleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class SampleController {

    private final SampleService sampleService;

    @PostMapping("/v1/samples")
    @PreAuthorize("hasAuthority('registration.create')")
    public ResponseEntity<SampleResponse> accession(@Valid @RequestBody AccessionSampleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sampleService.accession(req));
    }

    @GetMapping("/v1/samples/{accessionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SampleResponse> getById(@PathVariable String accessionId) {
        return ResponseEntity.ok(sampleService.getById(accessionId));
    }

    @PatchMapping("/v1/samples/{accessionId}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SampleResponse> updateStatus(@PathVariable String accessionId,
                                                       @Valid @RequestBody UpdateSampleStatusRequest req) {
        return ResponseEntity.ok(sampleService.updateStatus(accessionId, req));
    }

    @PostMapping("/v1/samples/{accessionId}/reject")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> reject(@PathVariable String accessionId,
                                                       @Valid @RequestBody RejectSampleRequest req) {
        SampleResponse r = sampleService.reject(accessionId, req);
        return ResponseEntity.ok(Map.of("status", r.getStatus(), "accessionId", r.getAccessionId()));
    }

    @GetMapping("/v1/samples/{accessionId}/label")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> getLabel(@PathVariable String accessionId) {
        byte[] label = sampleService.getLabel(accessionId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"label-" + accessionId + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(label);
    }

    @GetMapping("/v1/worklist")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, List<WorklistItemResponse>>> getWorklist(
            @RequestParam(name = "branch_id", required = false) String branchId,
            @RequestParam(name = "department_id", required = false) String departmentId,
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(Map.of("data", sampleService.getWorklist(branchId, departmentId, date)));
    }

    @GetMapping("/v1/samples/handover-pending")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, List<SampleResponse>>> getHandoverPending() {
        return ResponseEntity.ok(Map.of("data", sampleService.getHandoverPending()));
    }

    @PatchMapping("/v1/samples/{accessionId}/handover")
    @PreAuthorize("hasAuthority('report.handover')")
    public ResponseEntity<HandoverResponse> handover(@PathVariable String accessionId,
                                                     @Valid @RequestBody HandoverRequest req) {
        return ResponseEntity.ok(sampleService.handover(accessionId, req));
    }
}
