package com.diagdesk.catalog.controller;

import com.diagdesk.catalog.dto.response.LetterheadResponse;
import com.diagdesk.catalog.service.LetterheadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/letterheads")
@RequiredArgsConstructor
public class LetterheadController {

    private final LetterheadService letterheadService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('report.stationery.manage')")
    public ResponseEntity<Map<String, String>> create(
            @RequestPart(required = false) MultipartFile logo,
            @RequestParam(required = false) String headerHtml,
            @RequestParam(required = false) String footerHtml,
            @RequestParam(name = "margin_top_mm", required = false) Integer marginTopMm,
            @RequestParam(name = "margin_bottom_mm", required = false) Integer marginBottomMm,
            @RequestParam(name = "branch_id", required = false) String branchId) {

        LetterheadResponse r = letterheadService.create(logo, headerHtml, footerHtml, marginTopMm, marginBottomMm, branchId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("letterhead_id", r.getLetterheadId(), "preview_url", "/v1/letterheads/" + r.getLetterheadId()));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<LetterheadResponse>> list() {
        return ResponseEntity.ok(letterheadService.list());
    }

    @PutMapping(value = "/{letterheadId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('report.stationery.manage')")
    public ResponseEntity<LetterheadResponse> update(
            @PathVariable String letterheadId,
            @RequestPart(required = false) MultipartFile logo,
            @RequestParam(required = false) String headerHtml,
            @RequestParam(required = false) String footerHtml,
            @RequestParam(name = "margin_top_mm", required = false) Integer marginTopMm,
            @RequestParam(name = "margin_bottom_mm", required = false) Integer marginBottomMm) {

        return ResponseEntity.ok(letterheadService.update(letterheadId, logo, headerHtml, footerHtml, marginTopMm, marginBottomMm));
    }
}
