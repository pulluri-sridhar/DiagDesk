package com.diagdesk.order.controller;

import com.diagdesk.common.dto.PageResponse;
import com.diagdesk.order.dto.request.*;
import com.diagdesk.order.dto.response.*;
import com.diagdesk.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @PreAuthorize("hasAuthority('registration.create')")
    public ResponseEntity<CreateOrderResponse> create(@Valid @RequestBody CreateOrderRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.create(req));
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderResponse> getById(@PathVariable String orderId) {
        return ResponseEntity.ok(orderService.getById(orderId));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PageResponse<OrderResponse>> search(
            @RequestParam(name = "patient_id", required = false) String patientId,
            @RequestParam(required = false) String status,
            @RequestParam(name = "branch_id", required = false) String branchId,
            @RequestParam(name = "date_from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(name = "date_to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                orderService.search(patientId, status, branchId, dateFrom, dateTo, priority, page, size));
    }

    @PatchMapping("/{orderId}/cancel")
    @PreAuthorize("hasAuthority('registration.create')")
    public ResponseEntity<OrderResponse> cancel(@PathVariable String orderId,
                                                @Valid @RequestBody CancelOrderRequest req) {
        return ResponseEntity.ok(orderService.cancel(orderId, req));
    }

    @PostMapping("/{orderId}/add-tests")
    @PreAuthorize("hasAuthority('registration.create')")
    public ResponseEntity<java.util.Map<String, List<String>>> addTests(
            @PathVariable String orderId,
            @Valid @RequestBody AddTestsRequest req) {
        List<String> accessions = orderService.addTests(orderId, req);
        return ResponseEntity.ok(java.util.Map.of("new_accession_numbers", accessions));
    }

    @GetMapping("/tat-breaches")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<java.util.Map<String, List<TatBreachResponse>>> getTatBreaches(
            @RequestParam(name = "branch_id", required = false) String branchId,
            @RequestParam(name = "department_id", required = false) String departmentId) {
        return ResponseEntity.ok(java.util.Map.of("data",
                orderService.getTatBreaches(branchId, departmentId)));
    }
}
