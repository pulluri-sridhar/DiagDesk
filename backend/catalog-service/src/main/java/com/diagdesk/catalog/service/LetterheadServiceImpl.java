package com.diagdesk.catalog.service;

import com.diagdesk.catalog.dto.response.LetterheadResponse;
import com.diagdesk.catalog.entity.Letterhead;
import com.diagdesk.catalog.repository.LetterheadRepository;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LetterheadServiceImpl implements LetterheadService {

    private final LetterheadRepository letterheadRepository;

    @Override
    @Transactional
    public LetterheadResponse create(MultipartFile logo, String headerHtml, String footerHtml,
                                     Integer marginTopMm, Integer marginBottomMm, String branchId) {
        String tenantId = requireTenant();
        String logoUrl = uploadLogo(logo, tenantId);

        Letterhead lh = new Letterhead();
        lh.setLetterheadId(UUIDv7.generateAsString());
        lh.setTenantId(tenantId);
        lh.setBranchId(branchId);
        lh.setLogoUrl(logoUrl);
        lh.setHeaderHtml(headerHtml);
        lh.setFooterHtml(footerHtml);
        lh.setMarginTopMm(marginTopMm != null ? marginTopMm : 20);
        lh.setMarginBottomMm(marginBottomMm != null ? marginBottomMm : 20);
        letterheadRepository.save(lh);

        log.info("Letterhead created letterheadId={} branchId={}", lh.getLetterheadId(), branchId);
        return toResponse(lh);
    }

    @Override
    public List<LetterheadResponse> list() {
        return letterheadRepository.findAllByTenantIdOrderByCreatedAtDesc(requireTenant())
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public LetterheadResponse update(String letterheadId, MultipartFile logo, String headerHtml,
                                     String footerHtml, Integer marginTopMm, Integer marginBottomMm) {
        String tenantId = requireTenant();
        Letterhead lh = letterheadRepository.findByLetterheadIdAndTenantId(letterheadId, tenantId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND, "letterheadId=" + letterheadId));

        if (logo != null && !logo.isEmpty()) {
            lh.setLogoUrl(uploadLogo(logo, tenantId));
        }
        if (headerHtml != null) lh.setHeaderHtml(headerHtml);
        if (footerHtml != null) lh.setFooterHtml(footerHtml);
        if (marginTopMm != null) lh.setMarginTopMm(marginTopMm);
        if (marginBottomMm != null) lh.setMarginBottomMm(marginBottomMm);
        letterheadRepository.save(lh);
        return toResponse(lh);
    }

    /**
     * Uploads logo to object storage.
     * Returns the storage URL. Replace stub with actual S3/MinIO client when infrastructure is ready.
     */
    private String uploadLogo(MultipartFile logo, String tenantId) {
        if (logo == null || logo.isEmpty()) return null;
        String fileName = tenantId + "/" + UUIDv7.generateAsString() + "_" + logo.getOriginalFilename();
        log.info("Logo upload stub — would upload to object storage as: {}", fileName);
        return "/uploads/" + fileName;
    }

    private String requireTenant() {
        String t = TenantContext.getTenantId();
        if (t == null || t.isBlank()) throw new DiagDeskException(ErrorCode.TENANT_REQUIRED);
        return t;
    }

    private LetterheadResponse toResponse(Letterhead lh) {
        return LetterheadResponse.builder()
                .letterheadId(lh.getLetterheadId()).branchId(lh.getBranchId())
                .logoUrl(lh.getLogoUrl()).headerHtml(lh.getHeaderHtml())
                .footerHtml(lh.getFooterHtml()).marginTopMm(lh.getMarginTopMm())
                .marginBottomMm(lh.getMarginBottomMm()).createdAt(lh.getCreatedAt())
                .build();
    }
}
