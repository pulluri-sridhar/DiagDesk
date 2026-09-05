package com.diagdesk.b2b.controller;

import com.diagdesk.b2b.dto.request.LogFollowUpRequest;
import com.diagdesk.b2b.service.B2BReceivablesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class B2BReceivablesController {

    private final B2BReceivablesService receivablesService;

    @GetMapping("/v1/b2b/receivables/aging")
    @PreAuthorize("hasAnyAuthority('b2b.view','ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> agingReport() {
        return ResponseEntity.ok(receivablesService.agingReport());
    }

    @GetMapping("/v1/b2b/receivables/{partnerId}/statement")
    @PreAuthorize("hasAnyAuthority('b2b.view','ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> accountStatement(
            @PathVariable String partnerId,
            @RequestParam(name = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate effectiveFrom = from != null ? from : LocalDate.now().minusMonths(3);
        LocalDate effectiveTo   = to   != null ? to   : LocalDate.now();
        return ResponseEntity.ok(receivablesService.accountStatement(partnerId, effectiveFrom, effectiveTo));
    }

    @PostMapping("/v1/b2b/receivables/follow-ups")
    @PreAuthorize("hasAnyAuthority('b2b.edit','ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> logFollowUp(@Valid @RequestBody LogFollowUpRequest req) {
        return ResponseEntity.ok(receivablesService.logFollowUp(req));
    }

    @GetMapping("/v1/b2b/receivables/follow-ups")
    @PreAuthorize("hasAnyAuthority('b2b.view','ROLE_ADMIN')")
    public ResponseEntity<Map<String, List<Map<String, Object>>>> listFollowUps(
            @RequestParam(name = "partner_id") String partnerId) {
        return ResponseEntity.ok(Map.of("data", receivablesService.listFollowUps(partnerId)));
    }

    @PatchMapping("/v1/b2b/partners/{partnerId}/credit-limit")
    @PreAuthorize("hasAnyAuthority('b2b.edit','ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> updateCreditLimit(
            @PathVariable String partnerId,
            @RequestBody Map<String, BigDecimal> body) {
        BigDecimal newLimit = body.get("creditLimit");
        if (newLimit == null || newLimit.compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "creditLimit must be a non-negative number"));
        }
        return ResponseEntity.ok(receivablesService.updateCreditLimit(partnerId, newLimit));
    }
}
