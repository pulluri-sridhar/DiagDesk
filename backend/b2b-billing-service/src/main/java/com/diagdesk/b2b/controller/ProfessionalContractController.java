package com.diagdesk.b2b.controller;

import com.diagdesk.b2b.dto.request.CreateProfessionalContractRequest;
import com.diagdesk.b2b.entity.ProfessionalServiceContract;
import com.diagdesk.b2b.service.ProfessionalContractService;
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
public class ProfessionalContractController {

    private final ProfessionalContractService contractService;

    @PostMapping("/v1/professional-service-contracts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ProfessionalServiceContract> create(
            @Valid @RequestBody CreateProfessionalContractRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contractService.create(req));
    }

    @GetMapping("/v1/professional-service-contracts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ProfessionalServiceContract>> list(
            @RequestParam(required = false) String professionalId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(contractService.list(professionalId, status));
    }

    @GetMapping("/v1/professional-service-contracts/{contractId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ProfessionalServiceContract> getById(@PathVariable String contractId) {
        return ResponseEntity.ok(contractService.getById(contractId));
    }

    @PatchMapping("/v1/professional-service-contracts/{contractId}/terminate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> terminate(@PathVariable String contractId) {
        contractService.terminate(contractId);
        return ResponseEntity.ok(Map.of("contract_id", contractId, "status", "TERMINATED"));
    }
}
