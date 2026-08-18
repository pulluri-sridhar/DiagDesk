package com.diagdesk.audit.service;

import com.diagdesk.audit.dto.request.CreateBreachRequest;
import com.diagdesk.audit.dto.request.UpdateBreachRequest;
import com.diagdesk.audit.dto.response.BreachResponse;
import com.diagdesk.audit.entity.BreachNotification;
import com.diagdesk.audit.repository.BreachNotificationRepository;
import com.diagdesk.common.context.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BreachServiceImpl implements BreachService {

    private final BreachNotificationRepository breachRepository;

    @Override
    @Transactional
    public BreachResponse create(CreateBreachRequest req) {
        BreachNotification b = new BreachNotification();
        b.setBreachId(UUIDv7.generate());
        b.setTenantId(TenantContext.getTenantId());
        b.setTitle(req.getTitle());
        b.setDescription(req.getDescription());
        b.setAffectedPatientsCount(req.getAffectedPatientsCount());
        if (req.getDataCategories() != null) {
            b.setDataCategories(String.join(",", req.getDataCategories()));
        }
        b.setDetectedAt(req.getDetectedAt());
        b.setSeverity(req.getInitialSeverity());
        b.setStatus("OPEN");
        b.setDpdpDeadline(req.getDetectedAt().plusHours(72));
        b.setCertInDeadline(req.getDetectedAt().plusHours(6));
        return toResponse(breachRepository.save(b));
    }

    @Override
    @Transactional(readOnly = true)
    public BreachResponse getById(String breachId) {
        return breachRepository.findById(breachId)
                .map(this::toResponse)
                .orElseThrow(() -> new IllegalArgumentException("Breach not found: " + breachId));
    }

    @Override
    @Transactional
    public BreachResponse update(String breachId, UpdateBreachRequest req) {
        BreachNotification b = breachRepository.findById(breachId)
                .orElseThrow(() -> new IllegalArgumentException("Breach not found: " + breachId));
        if (req.getNotifiedAuthoritiesAt() != null) b.setNotifiedAuthoritiesAt(req.getNotifiedAuthoritiesAt());
        if (req.getResolutionNotes() != null) b.setResolutionNotes(req.getResolutionNotes());
        if (req.getStatus() != null) b.setStatus(req.getStatus());
        return toResponse(breachRepository.save(b));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BreachResponse> list() {
        return breachRepository.findByTenantIdOrderByCreatedAtDesc(TenantContext.getTenantId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private BreachResponse toResponse(BreachNotification b) {
        BreachResponse r = new BreachResponse();
        r.setBreachId(b.getBreachId());
        r.setTenantId(b.getTenantId());
        r.setTitle(b.getTitle());
        r.setDescription(b.getDescription());
        r.setAffectedPatientsCount(b.getAffectedPatientsCount());
        r.setDataCategories(b.getDataCategories());
        r.setDetectedAt(b.getDetectedAt());
        r.setSeverity(b.getSeverity());
        r.setStatus(b.getStatus());
        r.setDpdpDeadline(b.getDpdpDeadline());
        r.setCertInDeadline(b.getCertInDeadline());
        r.setNotifiedAuthoritiesAt(b.getNotifiedAuthoritiesAt());
        r.setResolutionNotes(b.getResolutionNotes());
        r.setCreatedAt(b.getCreatedAt());
        return r;
    }
}
