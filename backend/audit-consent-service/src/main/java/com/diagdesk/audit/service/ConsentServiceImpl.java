package com.diagdesk.audit.service;

import com.diagdesk.audit.dto.request.CreateConsentRequest;
import com.diagdesk.audit.dto.request.RevokeConsentRequest;
import com.diagdesk.audit.dto.response.ConsentResponse;
import com.diagdesk.audit.entity.Consent;
import com.diagdesk.audit.repository.ConsentRepository;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConsentServiceImpl implements ConsentService {

    private final ConsentRepository consentRepository;

    @Override
    @Transactional
    public ConsentResponse create(CreateConsentRequest req) {
        Consent c = new Consent();
        c.setConsentId(UUIDv7.generateAsString());
        c.setTenantId(TenantContext.getTenantId());
        c.setPatientId(req.getPatientId());
        c.setConsentType(Consent.ConsentType.valueOf(req.getConsentType().toUpperCase()));
        c.setPurpose(req.getPurpose());
        c.setLanguageCode(req.getLanguageCode() != null ? req.getLanguageCode() : "en");
        c.setConsentTextVersion(req.getConsentTextVersion());
        c.setCapturedVia(req.getCapturedVia());
        c.setIpAddress(req.getIpAddress());
        c.setStatus(Consent.ConsentStatus.ACTIVE);
        c.setCapturedAt(req.getCapturedAt() != null ? req.getCapturedAt() : OffsetDateTime.now());
        c.setHash(sha256(c.getPatientId() + c.getConsentType() + c.getCapturedAt()));
        return toResponse(consentRepository.save(c));
    }

    @Override
    @Transactional(readOnly = true)
    public ConsentResponse getById(String consentId) {
        return consentRepository.findById(consentId)
                .map(this::toResponse)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.CONSENT_NOT_FOUND, "Consent not found: " + consentId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConsentResponse> getByPatient(String patientId) {
        return consentRepository.findByPatientId(patientId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ConsentResponse revoke(String consentId, RevokeConsentRequest req) {
        Consent c = consentRepository.findById(consentId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.CONSENT_NOT_FOUND, "Consent not found: " + consentId));
        c.setStatus(Consent.ConsentStatus.REVOKED);
        c.setRevokedAt(OffsetDateTime.now());
        c.setRevokedBy(req.getRevokedBy());
        return toResponse(consentRepository.save(c));
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private ConsentResponse toResponse(Consent c) {
        ConsentResponse r = new ConsentResponse();
        r.setConsentId(c.getConsentId());
        r.setTenantId(c.getTenantId());
        r.setPatientId(c.getPatientId());
        r.setConsentType(c.getConsentType().name());
        r.setPurpose(c.getPurpose());
        r.setLanguageCode(c.getLanguageCode());
        r.setConsentTextVersion(c.getConsentTextVersion());
        r.setCapturedVia(c.getCapturedVia());
        r.setIpAddress(c.getIpAddress());
        r.setStatus(c.getStatus().name());
        r.setCapturedAt(c.getCapturedAt());
        r.setRevokedAt(c.getRevokedAt());
        r.setRevokedBy(c.getRevokedBy());
        r.setHash(c.getHash());
        return r;
    }
}
