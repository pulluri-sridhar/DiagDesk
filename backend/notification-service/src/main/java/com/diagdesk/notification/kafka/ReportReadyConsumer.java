package com.diagdesk.notification.kafka;

import com.diagdesk.notification.dto.request.SendNotificationRequest;
import com.diagdesk.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReportReadyConsumer {

    private final NotificationService notificationService;

    private static final String REPORT_READY_TEMPLATE = "report-ready-default";

    @KafkaListener(topics = "reporting.report-ready", groupId = "notification-service")
    public void onReportReady(ConsumerRecord<String, Map<String, Object>> record) {
        Map<String, Object> event = record.value();
        String patientId = (String) event.get("patient_id");
        String reportId = (String) event.get("report_id");
        if (patientId == null) return;

        log.info("ReportReady received reportId={}, sending notification to patient={}", reportId, patientId);
        try {
            SendNotificationRequest req = new SendNotificationRequest();
            req.setRecipientType("patient");
            req.setRecipientId(patientId);
            req.setChannel("WHATSAPP");
            req.setTemplateId(REPORT_READY_TEMPLATE);
            req.setVariables(Map.of("report_id", reportId != null ? reportId : ""));
            notificationService.send(req);
        } catch (Exception e) {
            log.error("Failed to send ReportReady notification for reportId={}: {}", reportId, e.getMessage());
        }
    }
}
