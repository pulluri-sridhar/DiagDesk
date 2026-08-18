package com.diagdesk.b2b.controller;

import com.diagdesk.b2b.dto.request.CreatePartnerRequest;
import com.diagdesk.b2b.dto.response.PartnerResponse;
import com.diagdesk.b2b.service.B2BPartnerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class B2BPartnerController {

    private final B2BPartnerService partnerService;

    @PostMapping("/v1/b2b-partners")
    @PreAuthorize("hasAnyAuthority('master.partner.manage','finance.reports.money_collections')")
    public ResponseEntity<PartnerResponse> create(@Valid @RequestBody CreatePartnerRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(partnerService.createPartner(req));
    }

    @GetMapping("/v1/b2b-partners")
    @PreAuthorize("hasAnyAuthority('master.partner.manage','finance.reports.money_collections')")
    public ResponseEntity<List<PartnerResponse>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean hasOverdue,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(partnerService.listPartners(q, hasOverdue, page, size));
    }

    @GetMapping("/v1/b2b-partners/{partnerId}")
    @PreAuthorize("hasAnyAuthority('master.partner.manage','finance.reports.money_collections')")
    public ResponseEntity<PartnerResponse> getById(@PathVariable String partnerId) {
        return ResponseEntity.ok(partnerService.getPartner(partnerId));
    }

    @PutMapping("/v1/b2b-partners/{partnerId}")
    @PreAuthorize("hasAnyAuthority('master.partner.manage','finance.reports.money_collections')")
    public ResponseEntity<PartnerResponse> update(
            @PathVariable String partnerId,
            @Valid @RequestBody CreatePartnerRequest req) {
        return ResponseEntity.ok(partnerService.updatePartner(partnerId, req));
    }

    @DeleteMapping("/v1/b2b-partners/{partnerId}")
    @PreAuthorize("hasAnyAuthority('master.partner.manage','finance.reports.money_collections')")
    public ResponseEntity<Void> delete(@PathVariable String partnerId) {
        partnerService.deletePartner(partnerId);
        return ResponseEntity.noContent().build();
    }
}
