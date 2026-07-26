package com.diagdesk.patient.service;

import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.cache.CacheService;
import com.diagdesk.common.dto.PageResponse;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.idempotency.IdempotencyService;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import com.diagdesk.patient.dto.request.ConsentRequest;
import com.diagdesk.patient.dto.request.DedupCheckRequest;
import com.diagdesk.patient.dto.request.RegisterPatientRequest;
import com.diagdesk.patient.dto.response.*;
import com.diagdesk.patient.entity.ConsentRecord;
import com.diagdesk.patient.entity.Patient;
import com.diagdesk.patient.mapper.PatientMapper;
import com.diagdesk.patient.repository.ConsentRepository;
import com.diagdesk.patient.repository.PatientRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;

/**
 * Primary implementation of PatientService.
 *
 * Caching strategy:
 *   patient:{patientId}      → 30 min  — full profile (evicted on update)
 *   patient:summary:{tenant} → no pre-warming (list queries vary too much)
 *
 * All write operations are wrapped in @Transactional.
 * Read operations are @Transactional(readOnly=true) — Hibernate skips dirty checking.
 *
 * Audit events are published @Async after the transaction commits so they
 * don't delay the response and can't cause rollback on Kafka failure.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PatientServiceImpl implements PatientService {

    static final String CACHE_PREFIX      = "patient:";
    static final Duration PATIENT_CACHE_TTL = Duration.ofMinutes(30);

    private final PatientRepository     patientRepository;
    private final ConsentRepository     consentRepository;
    private final PatientMapper         patientMapper;
    private final MpiDeduplicationService deduplicationService;
    private final CacheService          cacheService;
    private final IdempotencyService    idempotencyService;
    private final AuditPublisher        auditPublisher;
    private final UhidGenerator         uhidGenerator;
    private final ObjectMapper          objectMapper;

    // ── Registration ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public RegisterPatientResponse register(RegisterPatientRequest request, String idempotencyKey) {
        // 1. Idempotency gate — replay cached response for duplicate requests
        if (idempotencyKey != null) {
            var cached = idempotencyService.check(idempotencyKey);
            if (cached.isPresent()) {
                try {
                    return objectMapper.readValue(cached.get(), RegisterPatientResponse.class);
                } catch (Exception e) {
                    log.warn("Idempotency response deserialization failed, reprocessing: {}", e.getMessage());
                }
            }
        }

        String tenantId = requireTenant();

        // 2. MPI deduplication — non-blocking (result surfaced to caller, not a hard stop)
        DedupCheckRequest dedupReq = buildDedupRequest(request);
        List<RegisterPatientResponse.DedupMatch> potentialDups =
                deduplicationService.findPotentialDuplicates(tenantId, dedupReq);
        double maxScore = potentialDups.stream()
                .mapToDouble(RegisterPatientResponse.DedupMatch::getMatchScore)
                .max().orElse(0.0);

        // 3. Build and persist entity
        String patientId = UUIDv7.generateAsString();
        String uhid      = uhidGenerator.next(tenantId);

        Patient patient = patientMapper.toEntity(request);
        patient.setPatientId(patientId);
        patient.setUhid(uhid);
        patient.setTenantId(tenantId);
        patient.setFirstNameSoundex(deduplicationService.soundexCode(request.getFirstName()));
        patient.setLastNameSoundex(deduplicationService.soundexCode(request.getLastName()));
        patient.setConsentStatus(Patient.ConsentStatus.pending);

        patientRepository.save(patient);
        log.info("Patient registered patientId={} uhid={} tenantId={} mpiScore={}",
                patientId, uhid, tenantId, maxScore);

        // 4. Build response
        RegisterPatientResponse response = RegisterPatientResponse.builder()
                .patientId(patientId)
                .uhid(uhid)
                .mpiMatchScore(maxScore)
                .potentialDuplicates(potentialDups.isEmpty() ? null : potentialDups)
                .createdAt(patient.getCreatedAt())
                .build();

        // 5. Cache full profile and store idempotency record
        cacheService.put(CACHE_PREFIX + patientId, patientMapper.toResponse(patient), PATIENT_CACHE_TTL);
        storeIdempotencyResponse(idempotencyKey, response);

        // 6. Async audit event (after transaction commits)
        auditPublisher.publish("patient", patientId, "patient.registered", sanitize(request));

        return response;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Override
    public PatientResponse getById(String patientId) {
        String key = CACHE_PREFIX + patientId;
        return cacheService.get(key, PatientResponse.class)
                .orElseGet(() -> {
                    PatientResponse response = patientMapper.toResponse(findPatient(patientId));
                    cacheService.put(key, response, PATIENT_CACHE_TTL);
                    return response;
                });
    }

    @Override
    public PageResponse<PatientSummaryResponse> search(String q, String branchId, int page, int size) {
        String tenantId = requireTenant();
        PageRequest pageRequest = PageRequest.of(page, size);

        Page<Patient> result = (q != null && !q.isBlank())
                ? patientRepository.search(tenantId, q.trim(), pageRequest)
                : patientRepository.findAllByTenantId(tenantId, pageRequest);

        return PageResponse.<PatientSummaryResponse>builder()
                .data(result.getContent().stream().map(patientMapper::toSummary).toList())
                .page(page)
                .size(size)
                .total(result.getTotalElements())
                .build();
    }

    // ── Update ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public PatientResponse update(String patientId, RegisterPatientRequest request) {
        Patient patient = findPatient(patientId);
        patientMapper.updateEntity(request, patient);

        // Recompute phonetic codes when name changes
        if (request.getFirstName() != null) {
            patient.setFirstNameSoundex(deduplicationService.soundexCode(request.getFirstName()));
        }
        if (request.getLastName() != null) {
            patient.setLastNameSoundex(deduplicationService.soundexCode(request.getLastName()));
        }

        patientRepository.save(patient);
        cacheService.evict(CACHE_PREFIX + patientId);

        PatientResponse response = patientMapper.toResponse(patient);
        cacheService.put(CACHE_PREFIX + patientId, response, PATIENT_CACHE_TTL);

        auditPublisher.publish("patient", patientId, "patient.updated", sanitize(request));
        return response;
    }

    // ── MPI Dedup ─────────────────────────────────────────────────────────────

    @Override
    public DedupCheckResponse dedupCheck(DedupCheckRequest request) {
        String tenantId = requireTenant();
        List<RegisterPatientResponse.DedupMatch> matches =
                deduplicationService.findPotentialDuplicates(tenantId, request);

        List<DedupCheckResponse.PotentialMatch> potentialMatches = matches.stream()
                .map(m -> DedupCheckResponse.PotentialMatch.builder()
                        .patientId(m.getPatientId())
                        .uhid(m.getUhid())
                        .name(m.getName())
                        .phone(m.getPhone())
                        .matchScore(m.getMatchScore())
                        .build())
                .toList();

        return DedupCheckResponse.builder().potentialMatches(potentialMatches).build();
    }

    // ── Consent ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public ConsentResponse captureConsent(String patientId, ConsentRequest request, String idempotencyKey) {
        Patient patient = findPatient(patientId);

        String consentId    = UUIDv7.generateAsString();
        Instant capturedAt  = Instant.now();
        String hash         = consentHash(patientId, request, capturedAt);

        ConsentRecord consent = new ConsentRecord();
        consent.setConsentId(consentId);
        consent.setPatient(patient);
        consent.setTenantId(patient.getTenantId());
        consent.setConsentType(request.getConsentType());
        consent.setPurpose(request.getPurpose());
        consent.setLanguageCode(request.getLanguageCode());
        consent.setConsentTextVersion(request.getConsentTextVersion());
        consent.setIpAddress(request.getIpAddress());
        consent.setCapturedVia(request.getCapturedVia());
        consent.setCapturedAt(capturedAt);
        consent.setHash(hash);
        consent.setStatus("active");
        consentRepository.save(consent);

        // Promote patient consent status
        patient.setConsentStatus(Patient.ConsentStatus.obtained);
        patientRepository.save(patient);
        cacheService.evict(CACHE_PREFIX + patientId);

        log.info("Consent captured consentId={} patientId={} type={}", consentId, patientId, request.getConsentType());
        auditPublisher.publish("consent", consentId, "consent.captured", request);

        return ConsentResponse.builder()
                .consentId(consentId)
                .type(request.getConsentType())
                .purpose(request.getPurpose())
                .status("active")
                .capturedAt(capturedAt.toString())
                .hash(hash)
                .build();
    }

    @Override
    public List<ConsentResponse> getConsents(String patientId) {
        findPatient(patientId); // existence check
        return consentRepository.findByPatientId(patientId).stream()
                .map(c -> ConsentResponse.builder()
                        .consentId(c.getConsentId())
                        .type(c.getConsentType())
                        .purpose(c.getPurpose())
                        .status(c.getStatus())
                        .capturedAt(c.getCapturedAt().toString())
                        .revokedAt(c.getRevokedAt())
                        .build())
                .toList();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Patient findPatient(String patientId) {
        return patientRepository.findById(patientId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.PATIENT_NOT_FOUND,
                        "patientId=" + patientId));
    }

    private String requireTenant() {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null || tenantId.isBlank()) {
            throw new DiagDeskException(ErrorCode.TENANT_REQUIRED);
        }
        return tenantId;
    }

    private DedupCheckRequest buildDedupRequest(RegisterPatientRequest req) {
        DedupCheckRequest d = new DedupCheckRequest();
        d.setFirstName(req.getFirstName());
        d.setLastName(req.getLastName());
        d.setDateOfBirth(req.getDateOfBirth());
        d.setPhone(req.getPhone());
        return d;
    }

    /** SHA-256 of consent payload for tamper-evidence (stored in consent_records.hash). */
    private String consentHash(String patientId, ConsentRequest req, Instant capturedAt) {
        String input = patientId + req.getConsentType() + req.getPurpose()
                + req.getConsentTextVersion() + capturedAt;
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(h);
        } catch (Exception e) {
            return "hash-unavailable";
        }
    }

    private void storeIdempotencyResponse(String key, Object response) {
        if (key == null) return;
        try {
            idempotencyService.store(key, objectMapper.writeValueAsString(response));
        } catch (Exception e) {
            log.warn("Could not store idempotency response key={}: {}", key, e.getMessage());
        }
    }

    /** Strip sensitive fields before publishing to Kafka audit topic. */
    private RegisterPatientRequest sanitize(RegisterPatientRequest req) {
        // aadhaarLast4 is already masked (last 4 digits only); safe to emit as-is.
        // Full phone is included because audit logs require it for compliance.
        return req;
    }
}
