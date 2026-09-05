package com.diagdesk.catalog.controller;

import com.diagdesk.catalog.dto.request.CreatePanelRequest;
import com.diagdesk.catalog.dto.response.PanelResponse;
import com.diagdesk.catalog.dto.response.PanelSummaryResponse;
import com.diagdesk.catalog.service.PanelService;
import com.diagdesk.common.dto.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1/panels")
@RequiredArgsConstructor
public class PanelController {

    private final PanelService panelService;

    @PostMapping
    @PreAuthorize("hasAuthority('master.test.manage')")
    public ResponseEntity<Map<String, String>> create(@Valid @RequestBody CreatePanelRequest req) {
        PanelResponse r = panelService.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("panel_id", r.getPanelId()));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PageResponse<PanelSummaryResponse>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(panelService.search(q, type, page, size));
    }

    @GetMapping("/{panelId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PanelResponse> getById(@PathVariable String panelId) {
        return ResponseEntity.ok(panelService.getById(panelId));
    }

    @PutMapping("/{panelId}")
    @PreAuthorize("hasAuthority('master.test.manage')")
    public ResponseEntity<PanelResponse> update(@PathVariable String panelId,
                                                @Valid @RequestBody CreatePanelRequest req) {
        return ResponseEntity.ok(panelService.update(panelId, req));
    }

    @DeleteMapping("/{panelId}")
    @PreAuthorize("hasAuthority('master.test.manage')")
    public ResponseEntity<Void> delete(@PathVariable String panelId) {
        panelService.delete(panelId);
        return ResponseEntity.noContent().build();
    }
}
