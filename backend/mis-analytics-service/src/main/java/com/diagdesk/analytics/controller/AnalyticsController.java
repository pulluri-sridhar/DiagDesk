package com.diagdesk.analytics.controller;

import com.diagdesk.analytics.service.AnalyticsQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsQueryService analyticsQueryService;

    @GetMapping("/v1/analytics/summary")
    @PreAuthorize("hasAnyAuthority('finance.reports.master','finance.reports.money_collections')")
    public ResponseEntity<Map<String, Object>> getSummary(
            @RequestParam(required = false) String branchId) {
        return ResponseEntity.ok(analyticsQueryService.getSummary(branchId));
    }

    @GetMapping("/v1/analytics/revenue")
    @PreAuthorize("hasAuthority('finance.reports.money_collections')")
    public ResponseEntity<Map<String, Object>> getRevenue(
            @RequestParam(required = false) String branchId,
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) String groupBy) {
        return ResponseEntity.ok(analyticsQueryService.getRevenue(branchId, period, groupBy));
    }

    @GetMapping("/v1/analytics/tat")
    @PreAuthorize("hasAuthority('finance.reports.master')")
    public ResponseEntity<Map<String, Object>> getTat(
            @RequestParam(required = false) String branchId,
            @RequestParam(required = false) String deptId,
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(analyticsQueryService.getTat(branchId, deptId, period));
    }

    @GetMapping("/v1/analytics/samples")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getSamples(
            @RequestParam(required = false) String branchId,
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(analyticsQueryService.getSamples(branchId, period));
    }

    @GetMapping("/v1/analytics/referrals")
    @PreAuthorize("hasAuthority('finance.reports.referral_activity')")
    public ResponseEntity<Map<String, Object>> getReferrals(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(defaultValue = "10") int topN,
            @RequestParam(required = false) String branchId) {
        return ResponseEntity.ok(analyticsQueryService.getReferrals(period, topN, branchId));
    }

    @GetMapping("/v1/analytics/patients/geography")
    @PreAuthorize("hasAuthority('finance.reports.master')")
    public ResponseEntity<Map<String, Object>> getGeography(
            @RequestParam(required = false) String branchId,
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(analyticsQueryService.getGeography(branchId, period));
    }

    @GetMapping("/v1/analytics/tests/performance")
    @PreAuthorize("hasAuthority('finance.reports.master')")
    public ResponseEntity<Map<String, Object>> getTestPerformance(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) String deptId) {
        return ResponseEntity.ok(analyticsQueryService.getTestPerformance(period, deptId));
    }

    @GetMapping("/v1/analytics/operations")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getOperations(
            @RequestParam(required = false) String branchId,
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(analyticsQueryService.getOperations(branchId, period));
    }

    @GetMapping("/v1/analytics/finance")
    @PreAuthorize("hasAuthority('finance.reports.money_collections')")
    public ResponseEntity<Map<String, Object>> getFinance(
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(analyticsQueryService.getFinance(period));
    }

    @GetMapping("/v1/analytics/alerts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getAlerts() {
        return ResponseEntity.ok(analyticsQueryService.getAlerts());
    }

    @PostMapping("/v1/analytics/alerts/{alertId}/acknowledge")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> acknowledgeAlert(@PathVariable String alertId) {
        return ResponseEntity.ok(analyticsQueryService.acknowledgeAlert(alertId));
    }

    @PostMapping("/v1/analytics/digests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> createDigest(@RequestBody Map<String, Object> req) {
        String id = analyticsQueryService.createDigest(req);
        return ResponseEntity.ok(Map.of("subscription_id", id));
    }

    @GetMapping("/v1/analytics/digests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> listDigests() {
        return ResponseEntity.ok(analyticsQueryService.listDigests());
    }

    @DeleteMapping("/v1/analytics/digests/{subscriptionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteDigest(@PathVariable String subscriptionId) {
        analyticsQueryService.deleteDigest(subscriptionId);
        return ResponseEntity.noContent().build();
    }
}
