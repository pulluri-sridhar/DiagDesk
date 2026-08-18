package com.diagdesk.reporting.service;

import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.idempotency.IdempotencyService;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import com.diagdesk.reporting.dto.request.*;
import com.diagdesk.reporting.dto.response.DeliveryStatusResponse;
import com.diagdesk.reporting.dto.response.ReportResponse;
import com.diagdesk.reporting.entity.PrintLog;
import com.diagdesk.reporting.entity.Report;
import com.diagdesk.reporting.entity.ReportDelivery;
import com.diagdesk.reporting.kafka.ReportEventProducer;
import com.diagdesk.reporting.repository.PrintLogRepository;
import com.diagdesk.reporting.repository.ReportDeliveryRepository;
import com.diagdesk.reporting.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportService {

    private final ReportRepository reportRepo;
    private final ReportDeliveryRepository deliveryRepo;
    private final PrintLogRepository printLogRepo;
    private final ReportEventProducer eventProducer;

    @Override
    @Transactional
    public ReportResponse generate(GenerateReportRequest req) {
        Report report = reportRepo.findByOrderId(req.getOrderId()).orElseGet(() -> {
            Report r = new Report();
            r.setReportId(UUIDv7.generate());
            r.setOrderId(req.getOrderId());
            r.setTemplateId(req.getTemplateId());
            r.setLetterheadId(req.getLetterheadId());
            return r;
        });
        report.setStatus(Report.ReportStatus.PENDING_SIGNOFF);
        reportRepo.save(report);
        log.info("Report generated reportId={} orderId={}", report.getReportId(), req.getOrderId());
        return toResponse(report);
    }

    @Override
    @Transactional(readOnly = true)
    public ReportResponse getById(String reportId) {
        return toResponse(findReport(reportId));
    }

    @Override
    @Transactional
    public ReportResponse edit(String reportId, EditReportRequest req) {
        Report report = findReport(reportId);
        if (report.getStatus() == Report.ReportStatus.SIGNED_OFF) {
            throw new DiagDeskException(ErrorCode.INVALID_STATE, "Cannot edit a signed-off report");
        }
        if (req.getClinicalNotes() != null) report.setClinicalNotes(req.getClinicalNotes());
        if (req.getInterpretation() != null) report.setInterpretation(req.getInterpretation());
        reportRepo.save(report);
        return toResponse(report);
    }

    @Override
    @Transactional
    public ReportResponse signoff(String reportId, SignoffReportRequest req) {
        Report report = findReport(reportId);
        if (report.getStatus() == Report.ReportStatus.SIGNED_OFF) {
            throw new DiagDeskException(ErrorCode.INVALID_STATE, "Report already signed off");
        }
        report.setStatus(Report.ReportStatus.SIGNED_OFF);
        report.setSignedBy(TenantContext.getUserId());
        report.setSignedAt(Instant.now());
        reportRepo.save(report);
        eventProducer.publishReportReady(report);
        log.info("Report signed off reportId={} by={}", reportId, report.getSignedBy());
        return toResponse(report);
    }

    @Override
    @Transactional
    public List<Map<String, String>> deliver(String reportId, DeliverReportRequest req) {
        Report report = findReport(reportId);
        if (report.getStatus() != Report.ReportStatus.SIGNED_OFF) {
            throw new DiagDeskException(ErrorCode.INVALID_STATE, "Report must be signed off before delivery");
        }
        List<Map<String, String>> results = new ArrayList<>();
        for (String channel : req.getChannels()) {
            ReportDelivery delivery = new ReportDelivery();
            delivery.setDeliveryId(UUIDv7.generate());
            delivery.setReport(report);
            delivery.setChannel(ReportDelivery.Channel.valueOf(channel.toUpperCase()));
            delivery.setRecipientId(req.getRecipientId());
            delivery.setRecipientType(req.getRecipientType());
            delivery.setStatus(ReportDelivery.DeliveryStatus.QUEUED);
            deliveryRepo.save(delivery);
            eventProducer.publishDeliveryQueued(report, delivery);
            results.add(Map.of("channel", channel, "delivery_id", delivery.getDeliveryId(), "status", "queued"));
        }
        return results;
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryStatusResponse deliveryStatus(String reportId) {
        List<ReportDelivery> deliveries = deliveryRepo.findByReport_ReportId(reportId);
        DeliveryStatusResponse response = new DeliveryStatusResponse();
        response.setDeliveries(deliveries.stream().map(d -> {
            DeliveryStatusResponse.ChannelDelivery cd = new DeliveryStatusResponse.ChannelDelivery();
            cd.setDeliveryId(d.getDeliveryId());
            cd.setChannel(d.getChannel().name().toLowerCase());
            cd.setStatus(d.getStatus().name().toLowerCase());
            cd.setDeliveredAt(d.getDeliveredAt());
            cd.setFailureReason(d.getFailureReason());
            return cd;
        }).collect(Collectors.toList()));
        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> print(String reportId, PrintReportRequest req) {
        Report report = findReport(reportId);
        PrintLog log = new PrintLog();
        log.setPrintLogId(UUIDv7.generate());
        log.setReport(report);
        log.setCopies(req.getCopies());
        log.setPrintedBy(req.getPrintedBy() != null ? req.getPrintedBy() : TenantContext.getUserId());
        log.setPrinterId(req.getPrinterId());
        printLogRepo.save(log);
        report.setPrintCount(report.getPrintCount() + req.getCopies());
        reportRepo.save(report);
        return Map.of("print_log_id", log.getPrintLogId(), "print_count", report.getPrintCount(), "printed_at", log.getPrintedAt().toString());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> printLog(String reportId) {
        return printLogRepo.findByReport_ReportIdOrderByPrintedAtAsc(reportId).stream()
                .map(p -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("print_log_id", p.getPrintLogId());
                    m.put("copies", p.getCopies());
                    m.put("printed_by", p.getPrintedBy());
                    m.put("printed_at", p.getPrintedAt().toString());
                    return m;
                }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReportResponse> listByPatient(String patientId) {
        return reportRepo.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    private Report findReport(String reportId) {
        return reportRepo.findById(reportId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND, "Report not found: " + reportId));
    }

    private ReportResponse toResponse(Report r) {
        ReportResponse resp = new ReportResponse();
        resp.setReportId(r.getReportId());
        resp.setOrderId(r.getOrderId());
        resp.setPatientId(r.getPatientId());
        resp.setStatus(r.getStatus().name().toLowerCase());
        resp.setVersion(r.getVersion());
        resp.setPrintCount(r.getPrintCount());
        resp.setSignedBy(r.getSignedBy());
        resp.setSignedAt(r.getSignedAt());
        resp.setCreatedAt(r.getCreatedAt());
        if (r.getStatus() == Report.ReportStatus.SIGNED_OFF) {
            resp.setPdfUrl("/v1/reports/" + r.getReportId() + "/pdf");
        } else {
            resp.setPreviewUrl("/v1/reports/" + r.getReportId() + "/preview");
        }
        return resp;
    }
}
