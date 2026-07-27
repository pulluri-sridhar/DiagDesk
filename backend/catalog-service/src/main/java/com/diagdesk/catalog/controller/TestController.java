package com.diagdesk.catalog.controller;

import com.diagdesk.catalog.dto.request.*;
import com.diagdesk.catalog.dto.response.*;
import com.diagdesk.catalog.service.TestService;
import com.diagdesk.common.dto.PageResponse;
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
public class TestController {

    private final TestService testService;

    // ── Test master ───────────────────────────────────────────────────────────

    @PostMapping("/v1/tests")
    @PreAuthorize("hasAuthority('master.test.manage')")
    public ResponseEntity<Map<String, String>> create(@Valid @RequestBody CreateTestRequest req) {
        TestResponse r = testService.create(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("test_id", r.getTestId(), "created_at", r.getCreatedAt().toString()));
    }

    @GetMapping("/v1/tests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PageResponse<TestSummaryResponse>> search(
            @RequestParam(required = false) String q,
            @RequestParam(name = "department_id", required = false) String departmentId,
            @RequestParam(name = "is_custom", required = false) Boolean isCustom,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(testService.search(q, departmentId, isCustom, page, size));
    }

    @GetMapping("/v1/tests/{testId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TestResponse> getById(@PathVariable String testId) {
        return ResponseEntity.ok(testService.getById(testId));
    }

    @PutMapping("/v1/tests/{testId}")
    @PreAuthorize("hasAuthority('master.test.manage')")
    public ResponseEntity<TestResponse> update(@PathVariable String testId,
                                               @Valid @RequestBody CreateTestRequest req) {
        return ResponseEntity.ok(testService.update(testId, req));
    }

    @DeleteMapping("/v1/tests/{testId}")
    @PreAuthorize("hasAuthority('master.test.manage')")
    public ResponseEntity<Void> delete(@PathVariable String testId) {
        testService.delete(testId);
        return ResponseEntity.noContent().build();
    }

    // ── NABL catalogue ────────────────────────────────────────────────────────

    @GetMapping("/v1/nabl-catalogue")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PageResponse<NablEntryResponse>> browseNabl(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(testService.browsNablCatalogue(q, category, page, size));
    }

    @PostMapping("/v1/tests/import-from-nabl")
    @PreAuthorize("hasAuthority('master.test.manage')")
    public ResponseEntity<ImportFromNablResponse> importFromNabl(@Valid @RequestBody ImportFromNablRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(testService.importFromNabl(req));
    }

    // ── Reference ranges ──────────────────────────────────────────────────────

    @PostMapping("/v1/tests/{testId}/reference-ranges")
    @PreAuthorize("hasAuthority('master.test.manage')")
    public ResponseEntity<Map<String, String>> addRange(@PathVariable String testId,
                                                        @Valid @RequestBody CreateReferenceRangeRequest req) {
        ReferenceRangeResponse r = testService.addReferenceRange(testId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("range_id", r.getRangeId()));
    }

    @GetMapping("/v1/tests/{testId}/reference-ranges")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ReferenceRangeResponse>> getRanges(@PathVariable String testId) {
        return ResponseEntity.ok(testService.getReferenceRanges(testId));
    }

    @PutMapping("/v1/tests/{testId}/reference-ranges/{rangeId}")
    @PreAuthorize("hasAuthority('master.test.manage')")
    public ResponseEntity<ReferenceRangeResponse> updateRange(@PathVariable String testId,
                                                              @PathVariable String rangeId,
                                                              @Valid @RequestBody CreateReferenceRangeRequest req) {
        return ResponseEntity.ok(testService.updateReferenceRange(testId, rangeId, req));
    }

    @DeleteMapping("/v1/tests/{testId}/reference-ranges/{rangeId}")
    @PreAuthorize("hasAuthority('master.test.manage')")
    public ResponseEntity<Void> deleteRange(@PathVariable String testId, @PathVariable String rangeId) {
        testService.deleteReferenceRange(testId, rangeId);
        return ResponseEntity.noContent().build();
    }
}
