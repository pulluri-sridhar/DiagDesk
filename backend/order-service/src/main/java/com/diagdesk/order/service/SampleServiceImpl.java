package com.diagdesk.order.service;

import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import com.diagdesk.order.dto.request.*;
import com.diagdesk.order.dto.response.*;
import com.diagdesk.order.entity.*;
import com.diagdesk.order.entity.Sample.SampleStatus;
import com.diagdesk.order.repository.*;
import com.diagdesk.order.statemachine.SampleStateMachine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SampleServiceImpl implements SampleService {

    private final SampleRepository sampleRepository;
    private final SampleRejectionRepository rejectionRepository;
    private final SampleHandoverRepository handoverRepository;
    private final OrderRepository orderRepository;
    private final AccessionNumberGenerator accessionGen;
    private final SampleStateMachine stateMachine;
    private final AuditPublisher auditPublisher;

    @Override
    @Transactional
    public SampleResponse accession(AccessionSampleRequest req) {
        String tenantId = requireTenant();
        Order order = orderRepository.findById(req.getOrderId())
                .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND, "orderId=" + req.getOrderId()));

        String accNum = accessionGen.nextAccessionNumber();
        Sample sample = new Sample();
        sample.setAccessionId(UUIDv7.generateAsString());
        sample.setAccessionNumber(accNum);
        sample.setBarcode(accessionGen.toBarcode(accNum));
        sample.setOrder(order);
        sample.setPatientId(order.getPatientId());
        sample.setTenantId(tenantId);
        sample.setSpecimenType(req.getSpecimenType());
        sample.setContainer(req.getContainer());
        sample.setCollectedBy(req.getCollectedBy());
        sample.setCollectedAt(req.getCollectedAt() != null ? req.getCollectedAt() : Instant.now());
        if (req.getCollectionLocation() != null) {
            sample.setCollectionLocation(Sample.CollectionLocation.valueOf(req.getCollectionLocation()));
        }
        sample.setTatDeadline(order.getEstimatedTat());
        sampleRepository.save(sample);

        // Advance order to collected
        if (order.getStatus() == Order.OrderStatus.pending_collection) {
            order.setStatus(Order.OrderStatus.collected);
            orderRepository.save(order);
        }

        log.info("Sample accessioned accessionId={} accessionNumber={}", sample.getAccessionId(), accNum);
        auditPublisher.publish("sample", sample.getAccessionId(), "sample.accessioned",
                Map.of("orderId", req.getOrderId(), "specimenType", req.getSpecimenType() != null ? req.getSpecimenType() : ""));

        return toResponse(sample);
    }

    @Override
    public SampleResponse getById(String accessionId) {
        return toResponse(findSample(accessionId));
    }

    @Override
    @Transactional
    public SampleResponse updateStatus(String accessionId, UpdateSampleStatusRequest req) {
        Sample sample = findSample(accessionId);
        SampleStatus newStatus = SampleStatus.valueOf(req.getStatus());
        stateMachine.validateTransition(sample.getStatus(), newStatus);

        sample.setStatus(newStatus);
        if (req.getNotes() != null) sample.setNotes(req.getNotes());

        if (newStatus == SampleStatus.received)    sample.setReceivedAt(Instant.now());
        if (newStatus == SampleStatus.processed)   sample.setProcessedAt(Instant.now());
        if (newStatus == SampleStatus.reported)    sample.setReportedAt(Instant.now());

        sampleRepository.save(sample);

        auditPublisher.publish("sample", accessionId, "sample.status_changed",
                Map.of("status", req.getStatus()));
        return toResponse(sample);
    }

    @Override
    @Transactional
    public SampleResponse reject(String accessionId, RejectSampleRequest req) {
        Sample sample = findSample(accessionId);
        stateMachine.validateTransition(sample.getStatus(), SampleStatus.rejected);
        sample.setStatus(SampleStatus.rejected);
        sampleRepository.save(sample);

        SampleRejection rejection = new SampleRejection();
        rejection.setRejectionId(UUIDv7.generateAsString());
        rejection.setAccessionId(accessionId);
        rejection.setRejectionReasonCode(req.getRejectionReasonCode());
        rejection.setNotes(req.getNotes());
        rejection.setReCollectionRequired(req.isReCollectionRequired());
        rejection.setRejectedAt(Instant.now());
        rejection.setRejectedBy(req.getRejectedBy());
        rejectionRepository.save(rejection);

        log.info("Sample rejected accessionId={} reason={}", accessionId, req.getRejectionReasonCode());
        auditPublisher.publish("sample", accessionId, "sample.rejected",
                Map.of("reason", req.getRejectionReasonCode()));

        return toResponse(sample);
    }

    @Override
    public byte[] getLabel(String accessionId) {
        Sample sample = findSample(accessionId);
        // Stub — returns minimal text-based label content.
        // Replace with iText/OpenPDF label generation when print infrastructure is ready.
        String label = String.format("DiagDesk Label\nAccession: %s\nBarcode: %s\nPatient: %s\n",
                sample.getAccessionNumber(), sample.getBarcode(), sample.getPatientId());
        return label.getBytes();
    }

    @Override
    public List<WorklistItemResponse> getWorklist(String branchId, String departmentId, String date) {
        String tenantId = requireTenant();
        // date filter: parse to start-of-day Instant if provided
        Instant dateFrom = null;
        if (date != null) {
            try {
                dateFrom = java.time.LocalDate.parse(date).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
            } catch (Exception e) {
                log.warn("Invalid date filter: {}", date);
            }
        }
        return sampleRepository.findWorklist(tenantId, branchId, dateFrom)
                .stream().map(s -> WorklistItemResponse.builder()
                        .accessionId(s.getAccessionId())
                        .accessionNumber(s.getAccessionNumber())
                        .orderId(s.getOrder().getOrderId())
                        .patientId(s.getPatientId())
                        .specimenType(s.getSpecimenType())
                        .container(s.getContainer())
                        .priority(s.getOrder().getPriority().name())
                        .status(s.getStatus().name())
                        .tatDeadline(s.getTatDeadline())
                        .tatBreached(s.isTatBreached())
                        .build())
                .toList();
    }

    @Override
    public List<SampleResponse> getHandoverPending() {
        return sampleRepository.findHandoverPending(requireTenant())
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public HandoverResponse handover(String accessionId, HandoverRequest req) {
        Sample sample = findSample(accessionId);
        stateMachine.validateTransition(sample.getStatus(), SampleStatus.handed_over);

        sample.setStatus(SampleStatus.handed_over);
        sample.setHandedOverAt(Instant.now());
        sampleRepository.save(sample);

        SampleHandover ho = new SampleHandover();
        ho.setHandoverId(UUIDv7.generateAsString());
        ho.setAccessionId(accessionId);
        ho.setHandedOverTo(req.getHandedOverTo());
        ho.setMethod(SampleHandover.HandoverMethod.valueOf(req.getMethod() != null ? req.getMethod() : "manual"));
        ho.setBarcodeScanned(req.getBarcodeScanned());
        ho.setHandedOverBy(req.getHandedOverBy());
        ho.setHandedOverAt(sample.getHandedOverAt());
        handoverRepository.save(ho);

        auditPublisher.publish("sample", accessionId, "sample.handed_over",
                Map.of("handedOverTo", ho.getHandedOverTo() != null ? ho.getHandedOverTo() : ""));

        return HandoverResponse.builder()
                .handoverId(ho.getHandoverId())
                .accessionId(accessionId)
                .handedOverTo(ho.getHandedOverTo())
                .handedOverAt(ho.getHandedOverAt())
                .build();
    }

    /** Scheduled every 5 minutes: mark samples whose TAT deadline has passed. */
    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void markTatBreaches() {
        // We don't have tenant list here — in production, drive this from a tenant registry
        // For now this runs as a background task per deployment instance
        log.debug("TAT breach check skipped — requires tenant registry integration");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Sample findSample(String accessionId) {
        return sampleRepository.findById(accessionId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND, "accessionId=" + accessionId));
    }

    private String requireTenant() {
        String t = TenantContext.getTenantId();
        if (t == null || t.isBlank()) throw new DiagDeskException(ErrorCode.TENANT_REQUIRED);
        return t;
    }

    private SampleResponse toResponse(Sample s) {
        return SampleResponse.builder()
                .accessionId(s.getAccessionId()).accessionNumber(s.getAccessionNumber())
                .barcode(s.getBarcode()).orderId(s.getOrder() != null ? s.getOrder().getOrderId() : null)
                .patientId(s.getPatientId()).specimenType(s.getSpecimenType())
                .container(s.getContainer()).status(s.getStatus().name())
                .collectedAt(s.getCollectedAt()).receivedAt(s.getReceivedAt())
                .processedAt(s.getProcessedAt()).tatDeadline(s.getTatDeadline())
                .tatBreached(s.isTatBreached())
                .labelUrl("/v1/samples/" + s.getAccessionId() + "/label")
                .build();
    }
}
