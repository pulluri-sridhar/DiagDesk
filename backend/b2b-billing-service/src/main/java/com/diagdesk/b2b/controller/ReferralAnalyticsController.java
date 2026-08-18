package com.diagdesk.b2b.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ReferralAnalyticsController {

    private static final String DISCLAIMER =
            "Analytics only. No payouts attached. Anti-kickback compliant.";

    @GetMapping("/v1/referral-analytics")
    @PreAuthorize("hasAuthority('finance.reports.referral_activity')")
    public ResponseEntity<Map<String, Object>> getReferralAnalytics(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(defaultValue = "10") int topN,
            @RequestParam(required = false) String branchId,
            @RequestParam(required = false) String sourceType) {
        Map<String, Object> result = new HashMap<>();
        result.put("period", period);
        result.put("top_n", topN);
        result.put("branch_id", branchId);
        result.put("source_type", sourceType);
        result.put("referral_sources", java.util.List.of());
        result.put("disclaimer", DISCLAIMER);
        return ResponseEntity.ok(result);
    }
}
