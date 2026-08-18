package com.diagdesk.reporting.kafka;

import com.diagdesk.reporting.dto.request.GenerateReportRequest;
import com.diagdesk.reporting.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ResultValidatedConsumer {

    private final ReportService reportService;

    @KafkaListener(topics = "result.validated", groupId = "reporting-service")
    public void onResultValidated(ConsumerRecord<String, Map<String, String>> record) {
        Map<String, String> event = record.value();
        String orderId = event.get("order_id");
        if (orderId == null) return;
        log.info("ResultValidated received orderId={}, auto-generating report draft", orderId);
        GenerateReportRequest req = new GenerateReportRequest();
        req.setOrderId(orderId);
        try {
            reportService.generate(req);
        } catch (Exception e) {
            log.warn("Report already exists or generation skipped for orderId={}: {}", orderId, e.getMessage());
        }
    }
}
