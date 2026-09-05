package com.diagdesk.audit.controller;

import com.diagdesk.audit.dto.request.CreateDsrRequest;
import com.diagdesk.audit.dto.response.DsrResponse;
import com.diagdesk.audit.service.DsrService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class DsrController {

    private final DsrService dsrService;

    @PostMapping("/v1/data-subject-requests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DsrResponse> create(@Valid @RequestBody CreateDsrRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dsrService.create(req));
    }

    @GetMapping("/v1/data-subject-requests/{dsrId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DsrResponse> getById(@PathVariable String dsrId) {
        return ResponseEntity.ok(dsrService.getById(dsrId));
    }

    @GetMapping("/v1/data-subject-requests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DsrResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String requestType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(dsrService.list(status, requestType, page, size));
    }
}
