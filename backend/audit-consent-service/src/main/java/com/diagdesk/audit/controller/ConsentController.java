package com.diagdesk.audit.controller;

import com.diagdesk.audit.dto.request.CreateConsentRequest;
import com.diagdesk.audit.dto.request.RevokeConsentRequest;
import com.diagdesk.audit.dto.response.ConsentResponse;
import com.diagdesk.audit.service.ConsentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ConsentController {

    private final ConsentService consentService;

    @PostMapping("/v1/consents")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ConsentResponse> create(@Valid @RequestBody CreateConsentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(consentService.create(req));
    }

    @GetMapping("/v1/consents/{consentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ConsentResponse> getById(@PathVariable String consentId) {
        return ResponseEntity.ok(consentService.getById(consentId));
    }

    @GetMapping("/v1/consents/patient/{patientId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ConsentResponse>> getByPatient(@PathVariable String patientId) {
        return ResponseEntity.ok(consentService.getByPatient(patientId));
    }

    @PostMapping("/v1/consents/{consentId}/revoke")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ConsentResponse> revoke(
            @PathVariable String consentId,
            @RequestBody RevokeConsentRequest req) {
        return ResponseEntity.ok(consentService.revoke(consentId, req));
    }
}
