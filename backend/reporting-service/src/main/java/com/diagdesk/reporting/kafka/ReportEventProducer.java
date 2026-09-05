package com.diagdesk.reporting.kafka;

import com.diagdesk.reporting.entity.Report;
import com.diagdesk.reporting.entity.ReportDelivery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReportEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishReportReady(Report report) {
        Map<String, String> event = Map.of(
                "event_type", "ReportReady",
                "report_id", report.getReportId(),
                "order_id", report.getOrderId(),
                "patient_id", report.getPatientId(),
                "signed_by", report.getSignedBy()
        );
        kafkaTemplate.send("reporting.report-ready", report.getReportId(), event);
        log.info("Published ReportReady reportId={}", report.getReportId());
    }

    public void publishDeliveryQueued(Report report, ReportDelivery delivery) {
        Map<String, String> event = Map.of(
                "event_type", "ReportDeliveryQueued",
                "report_id", report.getReportId(),
                "delivery_id", delivery.getDeliveryId(),
                "channel", delivery.getChannel().name(),
                "recipient_id", delivery.getRecipientId() != null ? delivery.getRecipientId() : ""
        );
        kafkaTemplate.send("reporting.delivery-queued", delivery.getDeliveryId(), event);
    }
}
