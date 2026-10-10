package com.diagdesk.catalog.service;

import com.diagdesk.catalog.dto.request.CreatePanelRequest;
import com.diagdesk.catalog.dto.response.PanelResponse;
import com.diagdesk.catalog.dto.response.PanelSummaryResponse;
import com.diagdesk.catalog.dto.response.TestSummaryResponse;
import com.diagdesk.catalog.entity.Panel;
import com.diagdesk.catalog.entity.Test;
import com.diagdesk.catalog.repository.PanelRepository;
import com.diagdesk.catalog.repository.TestRepository;
import com.diagdesk.common.dto.PageResponse;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PanelServiceImpl implements PanelService {

    private final PanelRepository panelRepository;
    private final TestRepository testRepository;

    @Override
    @Transactional
    public PanelResponse create(CreatePanelRequest req) {
        String tenantId = requireTenant();
        List<Test> tests = resolveTests(tenantId, req.getTestIds());

        Panel panel = new Panel();
        panel.setPanelId(UUIDv7.generateAsString());
        panel.setTenantId(tenantId);
        panel.setName(req.getName());
        panel.setType(Panel.PanelType.valueOf(req.getType().equals("package") ? "package_" : req.getType()));
        panel.setDescription(req.getDescription());
        panel.setTests(tests);
        panelRepository.save(panel);

        log.info("Panel created panelId={} name={}", panel.getPanelId(), panel.getName());
        return toResponse(panel);
    }

    @Override
    public PanelResponse getById(String panelId) {
        return toResponse(findPanel(panelId));
    }

    @Override
    public PageResponse<PanelSummaryResponse> search(String q, String type, int page, int size) {
        String tenantId = requireTenant();
        Page<Panel> result = panelRepository.search(tenantId, q, type, PageRequest.of(page, size));
        return PageResponse.<PanelSummaryResponse>builder()
                .data(result.getContent().stream().map(this::toSummary).toList())
                .page(page).size(size).total(result.getTotalElements())
                .build();
    }

    @Override
    @Transactional
    public PanelResponse update(String panelId, CreatePanelRequest req) {
        Panel panel = findPanel(panelId);
        String tenantId = panel.getTenantId();
        panel.setName(req.getName());
        panel.setType(Panel.PanelType.valueOf(req.getType().equals("package") ? "package_" : req.getType()));
        panel.setDescription(req.getDescription());
        panel.setTests(resolveTests(tenantId, req.getTestIds()));
        panelRepository.save(panel);
        return toResponse(panel);
    }

    @Override
    @Transactional
    public void delete(String panelId) {
        Panel panel = findPanel(panelId);
        panel.softDelete();
        panelRepository.save(panel);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Panel findPanel(String panelId) {
        return panelRepository.findById(panelId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND, "panelId=" + panelId));
    }

    private String requireTenant() {
        String t = TenantContext.getTenantId();
        if (t == null || t.isBlank()) throw new DiagDeskException(ErrorCode.TENANT_REQUIRED);
        return t;
    }

    private List<Test> resolveTests(String tenantId, List<String> testIds) {
        return testIds.stream()
                .map(id -> testRepository.findById(id)
                        .filter(t -> t.getTenantId().equals(tenantId))
                        .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND, "testId=" + id)))
                .toList();
    }

    private PanelResponse toResponse(Panel p) {
        return PanelResponse.builder()
                .panelId(p.getPanelId())
                .name(p.getName())
                .type(p.getType().name().replace("package_", "package"))
                .description(p.getDescription())
                .tests(p.getTests().stream().map(t -> TestSummaryResponse.builder()
                        .testId(t.getTestId()).code(t.getCode()).name(t.getName())
                        .unit(t.getUnit()).tatHours(t.getTatHours()).custom(t.isCustom())
                        .build()).toList())
                .createdAt(p.getCreatedAt()).updatedAt(p.getUpdatedAt())
                .build();
    }

    private PanelSummaryResponse toSummary(Panel p) {
        return PanelSummaryResponse.builder()
                .panelId(p.getPanelId()).name(p.getName())
                .type(p.getType().name().replace("package_", "package"))
                .testCount(p.getTests().size()).description(p.getDescription())
                .build();
    }
}
