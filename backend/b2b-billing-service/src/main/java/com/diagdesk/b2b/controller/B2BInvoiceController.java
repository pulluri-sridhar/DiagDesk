package com.diagdesk.b2b.controller;

import com.diagdesk.b2b.dto.request.RecordPaymentRequest;
import com.diagdesk.b2b.dto.response.InvoiceResponse;
import com.diagdesk.b2b.service.B2BInvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class B2BInvoiceController {

    private final B2BInvoiceService invoiceService;

    @GetMapping("/v1/b2b-invoices")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<InvoiceResponse>> list(
            @RequestParam(required = false) String partnerId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(invoiceService.listInvoices(partnerId, status, page, size));
    }

    @GetMapping("/v1/b2b-invoices/{invoiceId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceResponse> getById(@PathVariable String invoiceId) {
        return ResponseEntity.ok(invoiceService.getInvoice(invoiceId));
    }

    @PostMapping("/v1/b2b-invoices/{invoiceId}/send")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceResponse> send(
            @PathVariable String invoiceId,
            @RequestBody(required = false) Map<String, List<String>> body) {
        List<String> channels = body != null ? body.get("channels") : List.of("EMAIL");
        return ResponseEntity.ok(invoiceService.sendInvoice(invoiceId, channels));
    }

    @PostMapping("/v1/b2b-invoices/{invoiceId}/record-payment")
    @PreAuthorize("hasAuthority('finance.reports.money_collections')")
    public ResponseEntity<InvoiceResponse> recordPayment(
            @PathVariable String invoiceId,
            @Valid @RequestBody RecordPaymentRequest req) {
        return ResponseEntity.ok(invoiceService.recordPayment(invoiceId, req));
    }
}
