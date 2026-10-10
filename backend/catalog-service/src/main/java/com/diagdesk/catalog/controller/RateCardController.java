package com.diagdesk.catalog.controller;

import com.diagdesk.catalog.dto.request.CreateRateCardRequest;
import com.diagdesk.catalog.dto.request.ResolveRateRequest;
import com.diagdesk.catalog.dto.response.RateCardResponse;
import com.diagdesk.catalog.dto.response.RateCardSummaryResponse;
import com.diagdesk.catalog.dto.response.ResolvedRateResponse;
import com.diagdesk.catalog.service.RateCardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/rate-cards")
@RequiredArgsConstructor
public class RateCardController {

    private final RateCardService rateCardService;

    @PostMapping
    @PreAuthorize("hasAuthority('master.test.edit_rate')")
    public ResponseEntity<Map<String, String>> create(@Valid @RequestBody CreateRateCardRequest req) {
        RateCardResponse r = rateCardService.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("rate_card_id", r.getRateCardId()));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<RateCardSummaryResponse>> list(
            @RequestParam(required = false) String type,
            @RequestParam(name = "branch_id", required = false) String branchId,
            @RequestParam(name = "partner_id", required = false) String partnerId,
            @RequestParam(name = "active_on_date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate activeOn) {
        return ResponseEntity.ok(rateCardService.list(type, branchId, partnerId, activeOn));
    }

    @GetMapping("/{rateCardId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<RateCardResponse> getById(@PathVariable String rateCardId) {
        return ResponseEntity.ok(rateCardService.getById(rateCardId));
    }

    @PutMapping("/{rateCardId}")
    @PreAuthorize("hasAuthority('master.test.edit_rate')")
    public ResponseEntity<RateCardResponse> update(@PathVariable String rateCardId,
                                                   @Valid @RequestBody CreateRateCardRequest req) {
        return ResponseEntity.ok(rateCardService.update(rateCardId, req));
    }

    @DeleteMapping("/{rateCardId}")
    @PreAuthorize("hasAuthority('master.test.edit_rate')")
    public ResponseEntity<Void> delete(@PathVariable String rateCardId) {
        rateCardService.delete(rateCardId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/resolve")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ResolvedRateResponse> resolve(@Valid @RequestBody ResolveRateRequest req) {
        return ResponseEntity.ok(rateCardService.resolve(req));
    }
}
