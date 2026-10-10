package com.diagdesk.reporting.controller;

import com.diagdesk.reporting.dto.request.*;
import com.diagdesk.reporting.dto.response.DeliveryStatusResponse;
import com.diagdesk.reporting.dto.response.ReportResponse;
import com.diagdesk.reporting.service.ReportService;
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
public class ReportController {

    private final ReportService reportService;

    @PostMapping("/v1/reports/generate")
    @PreAuthorize("hasAuthority('report.signoff') or hasAuthority('ROLE_SYSTEM')")
    public ResponseEntity<ReportResponse> generate(@Valid @RequestBody GenerateReportRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reportService.generate(req));
    }

    @GetMapping("/v1/reports/{reportId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReportResponse> getById(@PathVariable String reportId) {
        return ResponseEntity.ok(reportService.getById(reportId));
    }

    @GetMapping("/v1/reports")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, List<ReportResponse>>> listByPatient(
            @RequestParam(name = "patient_id") String patientId) {
        return ResponseEntity.ok(Map.of("data", reportService.listByPatient(patientId)));
    }

    @PatchMapping("/v1/reports/{reportId}")
    @PreAuthorize("hasAuthority('report.signoff')")
    public ResponseEntity<ReportResponse> edit(@PathVariable String reportId,
                                               @RequestBody EditReportRequest req) {
        return ResponseEntity.ok(reportService.edit(reportId, req));
    }

    @PostMapping("/v1/reports/{reportId}/signoff")
    @PreAuthorize("hasAuthority('report.signoff')")
    public ResponseEntity<ReportResponse> signoff(@PathVariable String reportId,
                                                  @Valid @RequestBody SignoffReportRequest req) {
        return ResponseEntity.ok(reportService.signoff(reportId, req));
    }

    @PostMapping("/v1/reports/{reportId}/deliver")
    @PreAuthorize("hasAuthority('report.deliver')")
    public ResponseEntity<Map<String, List<Map<String, String>>>> deliver(
            @PathVariable String reportId,
            @Valid @RequestBody DeliverReportRequest req) {
        return ResponseEntity.ok(Map.of("delivery_ids", reportService.deliver(reportId, req)));
    }

    @GetMapping("/v1/reports/{reportId}/delivery-status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DeliveryStatusResponse> deliveryStatus(@PathVariable String reportId) {
        return ResponseEntity.ok(reportService.deliveryStatus(reportId));
    }

    @PostMapping("/v1/reports/{reportId}/print")
    @PreAuthorize("hasAuthority('report.print')")
    public ResponseEntity<Map<String, Object>> print(@PathVariable String reportId,
                                                     @RequestBody(required = false) PrintReportRequest req) {
        return ResponseEntity.ok(reportService.print(reportId, req != null ? req : new PrintReportRequest()));
    }

    @GetMapping("/v1/reports/{reportId}/print-log")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, List<Map<String, Object>>>> printLog(@PathVariable String reportId) {
        return ResponseEntity.ok(Map.of("prints", reportService.printLog(reportId)));
    }
}
