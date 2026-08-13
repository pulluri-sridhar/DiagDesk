package com.diagdesk.result.service;

import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import com.diagdesk.result.dto.request.*;
import com.diagdesk.result.dto.response.*;
import com.diagdesk.result.entity.*;
import com.diagdesk.result.entity.TestResult.ValidationStatus;
import com.diagdesk.result.repository.*;
import com.diagdesk.result.statemachine.ResultStateMachine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResultServiceImpl implements ResultService {

    private final TestResultRepository resultRepository;
    private final ResultAmendmentRepository amendmentRepository;
    private final ResultValidationRepository validationRepository;
    private final CriticalAcknowledgementRepository ackRepository;
    private final RepeatRequestRepository repeatRepository;
    private final FlagEvaluator flagEvaluator;
    private final DeltaCheckService deltaCheckService;
    private final OrderServiceClient orderServiceClient;
    private final ResultStateMachine stateMachine;
    private final AuditPublisher auditPublisher;

    @Override
    @Transactional
    public ResultResponse submit(SubmitResultRequest req) {
        String tenantId = TenantContext.getTenantId();
        String userId   = TenantContext.getUserId();

        // Resolve order + patient context from order-service
        OrderServiceClient.AccessionDetails accession = orderServiceClient.getAccessionDetails(req.getAccessionId(), tenantId);
        if (accession == null) {
            throw new DiagDeskException(ErrorCode.NOT_FOUND, "Accession not found: " + req.getAccessionId());
        }

        TestResult result = new TestResult();
        result.setResultId(UUIDv7.generateAsString());
        result.setAccessionId(req.getAccessionId());
        result.setTestId(req.getTestId());
        result.setOrderId(accession.getOrderId());
        result.setPatientId(accession.getPatientId());
        result.setBranchId(accession.getBranchId() != null ? accession.getBranchId() : TenantContext.getBranchId());
        result.setValue(req.getValue());
        result.setUnit(req.getUnit());
        result.setMethod(req.getMethod());
        result.setSource(TestResult.ResultSource.valueOf(req.getSource().toUpperCase()));
        result.setEnteredBy(req.getEnteredBy() != null ? req.getEnteredBy() : userId);
        result.setRawHl7Segment(req.getRawHl7Segment());
        result.setVersion(1);

        // Evaluate flags against catalog reference ranges
        FlagEvaluator.EvaluationResult eval = flagEvaluator.evaluate(req.getTestId(), req.getValue(), tenantId);
        result.setFlags(eval.flagsAsString());
        result.setReferenceRange(eval.referenceRange);

        // Determine initial validation status
        if (TestResult.ResultSource.ANALYZER == result.getSource() && !eval.hasCriticalFlag()) {
            result.setValidationStatus(ValidationStatus.AUTO_VALIDATED);
        } else {
            result.setValidationStatus(ValidationStatus.PENDING_MANUAL_VALIDATION);
        }

        resultRepository.save(result);

        auditPublisher.publish("result", result.getResultId(), "SUBMIT", null);

        log.info("Result submitted: {} for accession {} status={}", result.getResultId(), result.getAccessionId(), result.getValidationStatus());
        return toResponse(result);
    }

    @Override
    @Transactional(readOnly = true)
    public ResultResponse getById(String resultId) {
        return toResponse(findResult(resultId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResultResponse> listByAccession(String accessionId) {
        return resultRepository.findByAccessionIdAndTenantId(accessionId, TenantContext.getTenantId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResultResponse> listByOrder(String orderId) {
        return resultRepository.findByOrderIdAndTenantId(orderId, TenantContext.getTenantId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AmendResultResponse amend(String resultId, AmendResultRequest req) {
        TestResult result = findResult(resultId);
        String userId = TenantContext.getUserId();

        String previousValue = result.getValue();
        int newVersion = result.getVersion() + 1;

        // Record amendment history
        ResultAmendment amendment = new ResultAmendment();
        amendment.setAmendmentId(UUIDv7.generateAsString());
        amendment.setResult(result);
        amendment.setPreviousValue(previousValue);
        amendment.setNewValue(req.getValue());
        amendment.setAmendmentReason(req.getAmendmentReason());
        amendment.setAmendedBy(userId);
        amendment.setAmendedAt(LocalDateTime.now());
        amendment.setVersion(newVersion);
        amendmentRepository.save(amendment);

        // Update result to new value + bump version + re-evaluate flags
        result.setValue(req.getValue());
        if (req.getUnit() != null) result.setUnit(req.getUnit());
        result.setVersion(newVersion);

        FlagEvaluator.EvaluationResult eval = flagEvaluator.evaluate(result.getTestId(), req.getValue(), TenantContext.getTenantId());
        result.setFlags(eval.flagsAsString());

        // An amendment resets validation status back to pending manual review
        result.setValidationStatus(ValidationStatus.PENDING_MANUAL_VALIDATION);
        resultRepository.save(result);

        auditPublisher.publish("result", resultId, "AMEND", null);

        return AmendResultResponse.builder()
                .resultId(resultId)
                .version(newVersion)
                .value(req.getValue())
                .previousValue(previousValue)
                .amendedAt(LocalDateTime.now())
                .amendedBy(userId)
                .build();
    }

    @Override
    @Transactional
    public ValidationResponse validate(String resultId, ValidateResultRequest req) {
        TestResult result = findResult(resultId);
        String userId = TenantContext.getUserId();

        stateMachine.validateTransition(result.getValidationStatus(), ValidationStatus.PENDING_SIGNOFF);

        ResultValidation validation = new ResultValidation();
        validation.setValidationId(UUIDv7.generateAsString());
        validation.setResult(result);
        validation.setLevel(1);
        validation.setNotes(req.getNotes());
        validation.setValidatedBy(userId);
        validation.setValidatedAt(LocalDateTime.now());
        validationRepository.save(validation);

        result.setValidationStatus(ValidationStatus.PENDING_SIGNOFF);
        resultRepository.save(result);

        auditPublisher.publish("result", resultId, "VALIDATE_L1", null);

        return ValidationResponse.builder()
                .validationId(validation.getValidationId())
                .level(1)
                .validatedAt(validation.getValidatedAt())
                .validatedBy(userId)
                .newStatus(ValidationStatus.PENDING_SIGNOFF.name())
                .build();
    }

    @Override
    @Transactional
    public SignoffResponse signoff(String resultId, SignoffRequest req) {
        TestResult result = findResult(resultId);
        String userId = TenantContext.getUserId();

        stateMachine.validateTransition(result.getValidationStatus(), ValidationStatus.SIGNED_OFF);

        // PIN verification stub — in production verify against user credential store
        if ("pin".equalsIgnoreCase(req.getSignatureType()) && (req.getPin() == null || req.getPin().isBlank())) {
            throw new DiagDeskException(ErrorCode.VALIDATION_ERROR, "PIN is required for pin-based sign-off");
        }

        ResultSignoff signoff = new ResultSignoff();
        signoff.setSignoffId(UUIDv7.generateAsString());
        signoff.setResult(result);
        signoff.setSignatureType(ResultSignoff.SignatureType.valueOf(req.getSignatureType().toUpperCase()));
        signoff.setNotes(req.getNotes());
        signoff.setSignedBy(userId);
        signoff.setSignedAt(LocalDateTime.now());
        result.getSignoffs().add(signoff);

        result.setValidationStatus(ValidationStatus.SIGNED_OFF);
        resultRepository.save(result);

        auditPublisher.publish("result", resultId, "SIGN_OFF", null);

        log.info("Result {} signed off by {}", resultId, userId);

        return SignoffResponse.builder()
                .signoffId(signoff.getSignoffId())
                .signedAt(signoff.getSignedAt())
                .signedBy(userId)
                .newStatus(ValidationStatus.SIGNED_OFF.name())
                .build();
    }

    @Override
    @Transactional
    public ResultResponse rejectValidation(String resultId, RejectValidationRequest req) {
        TestResult result = findResult(resultId);
        String userId = TenantContext.getUserId();

        stateMachine.validateTransition(result.getValidationStatus(), ValidationStatus.PENDING_RERUN);

        result.setValidationStatus(ValidationStatus.PENDING_RERUN);
        resultRepository.save(result);

        auditPublisher.publish("result", resultId, "REJECT_VALIDATION", req.getReason());

        return toResponse(result);
    }

    @Override
    @Transactional(readOnly = true)
    public DeltaCheckResponse deltaCheck(String resultId) {
        return deltaCheckService.check(findResult(resultId));
    }

    @Override
    @Transactional
    public RepeatRequestResponse requestRepeat(String resultId, RepeatRequestRequest req) {
        TestResult result = findResult(resultId);
        String userId = TenantContext.getUserId();

        RepeatRequest repeat = new RepeatRequest();
        repeat.setRepeatRequestId(UUIDv7.generateAsString());
        repeat.setResultId(resultId);
        repeat.setReason(req.getReason());
        repeat.setPriority(req.getPriority());
        repeat.setRequestedBy(userId);
        repeat.setCreatedAt(LocalDateTime.now());
        repeatRepository.save(repeat);

        auditPublisher.publish("result", resultId, "REPEAT_REQUEST", req.getReason());

        return RepeatRequestResponse.builder()
                .repeatRequestId(repeat.getRepeatRequestId())
                .status("PENDING")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResultResponse> getPendingValidation(String branchId, Integer level, int page, int size) {
        String tenantId = TenantContext.getTenantId();

        // level 1 → PENDING_MANUAL_VALIDATION; level 2 → PENDING_SIGNOFF; null → both
        List<ValidationStatus> statuses = new ArrayList<>();
        if (level == null || level == 1) statuses.add(ValidationStatus.PENDING_MANUAL_VALIDATION);
        if (level == null || level == 2) statuses.add(ValidationStatus.PENDING_SIGNOFF);

        return resultRepository.findPendingValidation(tenantId, statuses, branchId, PageRequest.of(page, size))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CriticalAlertResponse> getCriticalAlerts() {
        return resultRepository.findUnacknowledgedCriticals(TenantContext.getTenantId())
                .stream()
                .map(r -> CriticalAlertResponse.builder()
                        .resultId(r.getResultId())
                        .patientId(r.getPatientId())
                        .value(r.getValue())
                        .flag(extractCriticalFlag(r.getFlags()))
                        .createdAt(toLocalDateTime(r.getCreatedAt()))
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AcknowledgementResponse acknowledgeCritical(String resultId, AcknowledgeCriticalRequest req) {
        findResult(resultId); // existence check

        CriticalAcknowledgement ack = new CriticalAcknowledgement();
        ack.setAcknowledgementId(UUIDv7.generateAsString());
        ack.setResultId(resultId);
        ack.setCalledAt(req.getCalledAt() != null ? req.getCalledAt() : LocalDateTime.now());
        ack.setCalledToPhone(req.getCalledToPhone());
        ack.setCallerId(req.getCallerId());
        ack.setResponseNotes(req.getResponseNotes());
        ack.setCreatedAt(LocalDateTime.now());
        ackRepository.save(ack);

        auditPublisher.publish("critical_ack", resultId, "ACKNOWLEDGE", "Called: " + req.getCalledToPhone());

        return AcknowledgementResponse.builder().acknowledgementId(ack.getAcknowledgementId()).build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditEventResponse> getAuditTrail(String resultId) {
        TestResult result = findResult(resultId);
        List<AuditEventResponse> events = new ArrayList<>();

        // Initial submission
        events.add(AuditEventResponse.builder()
                .eventType("SUBMITTED")
                .version(1)
                .value(null)
                .actor(result.getCreatedBy())
                .timestamp(toLocalDateTime(result.getCreatedAt()))
                .build());

        // Amendments
        amendmentRepository.findByResultResultIdOrderByVersionAsc(resultId)
                .forEach(a -> events.add(AuditEventResponse.builder()
                        .eventType("AMENDED")
                        .version(a.getVersion())
                        .value(a.getNewValue())
                        .actor(a.getAmendedBy())
                        .timestamp(a.getAmendedAt())
                        .notes(a.getAmendmentReason())
                        .build()));

        // Validations
        validationRepository.findByResultResultIdOrderByValidatedAtAsc(resultId)
                .forEach(v -> events.add(AuditEventResponse.builder()
                        .eventType("VALIDATED_L" + v.getLevel())
                        .version(result.getVersion())
                        .actor(v.getValidatedBy())
                        .timestamp(v.getValidatedAt())
                        .notes(v.getNotes())
                        .build()));

        // Sign-offs
        result.getSignoffs().forEach(s -> events.add(AuditEventResponse.builder()
                .eventType("SIGNED_OFF")
                .version(result.getVersion())
                .actor(s.getSignedBy())
                .timestamp(s.getSignedAt())
                .notes(s.getNotes())
                .build()));

        events.sort((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()));
        return events;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private TestResult findResult(String resultId) {
        return resultRepository.findByResultIdAndTenantId(resultId, TenantContext.getTenantId())
                .orElseThrow(() -> new DiagDeskException(ErrorCode.RESULT_NOT_FOUND));
    }

    private ResultResponse toResponse(TestResult r) {
        return ResultResponse.builder()
                .resultId(r.getResultId())
                .accessionId(r.getAccessionId())
                .testId(r.getTestId())
                .orderId(r.getOrderId())
                .patientId(r.getPatientId())
                .value(r.getValue())
                .unit(r.getUnit())
                .method(r.getMethod())
                .source(r.getSource() != null ? r.getSource().name() : null)
                .flags(r.getFlags() != null ? Arrays.asList(r.getFlags().split(",")) : List.of())
                .referenceRange(r.getReferenceRange())
                .validationStatus(r.getValidationStatus().name())
                .version(r.getVersion())
                .createdAt(toLocalDateTime(r.getCreatedAt()))
                .updatedAt(toLocalDateTime(r.getUpdatedAt()))
                .build();
    }

    private static LocalDateTime toLocalDateTime(Instant instant) {
        return instant == null ? null : LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    private String extractCriticalFlag(String flags) {
        if (flags == null) return null;
        for (String f : flags.split(",")) {
            if (f.startsWith("CRITICAL")) return f;
        }
        return null;
    }
}
