package com.diagdesk.audit.controller;

import com.diagdesk.audit.dto.request.CreateBreachRequest;
import com.diagdesk.audit.dto.request.UpdateBreachRequest;
import com.diagdesk.audit.dto.response.BreachResponse;
import com.diagdesk.audit.service.BreachService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class BreachController {

    private final BreachService breachService;

    @PostMapping("/v1/breach-notifications")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BreachResponse> create(@Valid @RequestBody CreateBreachRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(breachService.create(req));
    }

    @GetMapping("/v1/breach-notifications/{breachId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BreachResponse> getById(@PathVariable String breachId) {
        return ResponseEntity.ok(breachService.getById(breachId));
    }

    @PatchMapping("/v1/breach-notifications/{breachId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BreachResponse> update(
            @PathVariable String breachId,
            @RequestBody UpdateBreachRequest req) {
        return ResponseEntity.ok(breachService.update(breachId, req));
    }

    @GetMapping("/v1/breach-notifications")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BreachResponse>> list() {
        return ResponseEntity.ok(breachService.list());
    }
}
