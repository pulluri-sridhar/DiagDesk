package com.diagdesk.audit.service;

import com.diagdesk.audit.dto.request.CreateDsrRequest;
import com.diagdesk.audit.dto.response.DsrResponse;
import com.diagdesk.audit.entity.DataSubjectRequest;
import com.diagdesk.audit.repository.DataSubjectRequestRepository;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DsrServiceImpl implements DsrService {

    private final DataSubjectRequestRepository dsrRepository;

    @Override
    @Transactional
    public DsrResponse create(CreateDsrRequest req) {
        DataSubjectRequest dsr = new DataSubjectRequest();
        dsr.setDsrId(UUIDv7.generateAsString());
        dsr.setTenantId(TenantContext.getTenantId());
        dsr.setPatientId(req.getPatientId());
        dsr.setRequestType(DataSubjectRequest.RequestType.valueOf(req.getRequestType().toUpperCase()));
        dsr.setContactPhone(req.getContactPhone());
        dsr.setStatus(DataSubjectRequest.DsrStatus.RECEIVED);
        dsr.setReceivedAt(OffsetDateTime.now());
        dsr.setEstimatedCompletion(OffsetDateTime.now().plusDays(7));
        return toResponse(dsrRepository.save(dsr));
    }

    @Override
    @Transactional(readOnly = true)
    public DsrResponse getById(String dsrId) {
        return dsrRepository.findById(dsrId)
                .map(this::toResponse)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.RESOURCE_NOT_FOUND, "DSR not found: " + dsrId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DsrResponse> list(String status, String requestType, int page, int size) {
        String tenantId = TenantContext.getTenantId();
        if (status != null) {
            return dsrRepository.findByTenantIdAndStatus(
                    tenantId,
                    DataSubjectRequest.DsrStatus.valueOf(status.toUpperCase()),
                    PageRequest.of(page, size))
                    .stream().map(this::toResponse).collect(Collectors.toList());
        }
        return dsrRepository.findByTenantId(tenantId, PageRequest.of(page, size))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private DsrResponse toResponse(DataSubjectRequest d) {
        DsrResponse r = new DsrResponse();
        r.setDsrId(d.getDsrId());
        r.setTenantId(d.getTenantId());
        r.setPatientId(d.getPatientId());
        r.setRequestType(d.getRequestType().name());
        r.setContactPhone(d.getContactPhone());
        r.setStatus(d.getStatus().name());
        r.setReceivedAt(d.getReceivedAt());
        r.setEstimatedCompletion(d.getEstimatedCompletion());
        r.setCompletedAt(d.getCompletedAt());
        r.setNotes(d.getNotes());
        return r;
    }
}
