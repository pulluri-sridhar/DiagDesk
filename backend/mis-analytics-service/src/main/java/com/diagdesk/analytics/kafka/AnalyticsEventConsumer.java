package com.diagdesk.analytics.kafka;

import com.diagdesk.analytics.entity.DailyMetric;
import com.diagdesk.analytics.repository.DailyMetricRepository;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class AnalyticsEventConsumer {

    private final DailyMetricRepository dailyMetricRepository;

    @KafkaListener(topics = "patient.registered", groupId = "analytics-service")
    public void onPatientRegistered(ConsumerRecord<String, Map<String, Object>> record) {
        upsertCount(extractTenant(record), null, "patient.registered", null, null, 1L);
    }

    @KafkaListener(topics = "order.created", groupId = "analytics-service")
    public void onOrderCreated(ConsumerRecord<String, Map<String, Object>> record) {
        Map<String, Object> event = record.value();
        String tenantId = extractTenant(record);
        String branchId = (String) event.get("branch_id");
        upsertCount(tenantId, branchId, "order.created", null, null, 1L);

        Object amount = event.get("total_amount");
        if (amount != null) {
            BigDecimal revenue = new BigDecimal(amount.toString());
            upsertNumeric(tenantId, branchId, "order.revenue", null, null, revenue);
        }

        String referredBy = (String) event.get("referred_by_doctor_id");
        if (referredBy != null) {
            upsertCount(tenantId, branchId, "referral.orders", referredBy, null, 1L);
        }
    }

    @KafkaListener(topics = "sample.rejected", groupId = "analytics-service")
    public void onSampleRejected(ConsumerRecord<String, Map<String, Object>> record) {
        Map<String, Object> event = record.value();
        upsertCount(extractTenant(record), (String) event.get("branch_id"), "sample.rejected", null, null, 1L);
    }

    @KafkaListener(topics = "tat.breached", groupId = "analytics-service")
    public void onTatBreached(ConsumerRecord<String, Map<String, Object>> record) {
        Map<String, Object> event = record.value();
        upsertCount(extractTenant(record), (String) event.get("branch_id"), "tat.breached", null, null, 1L);
    }

    @KafkaListener(topics = "result.validated", groupId = "analytics-service")
    public void onResultValidated(ConsumerRecord<String, Map<String, Object>> record) {
        upsertCount(extractTenant(record), null, "result.validated", null, null, 1L);
    }

    @KafkaListener(topics = "reporting.report-ready", groupId = "analytics-service")
    public void onReportReady(ConsumerRecord<String, Map<String, Object>> record) {
        upsertCount(extractTenant(record), null, "report.ready", null, null, 1L);
    }

    @KafkaListener(topics = "reporting.delivery-queued", groupId = "analytics-service")
    public void onReportDelivered(ConsumerRecord<String, Map<String, Object>> record) {
        upsertCount(extractTenant(record), null, "report.delivered", null, null, 1L);
    }

    @KafkaListener(topics = "billing.invoice-created", groupId = "analytics-service")
    public void onInvoiceCreated(ConsumerRecord<String, Map<String, Object>> record) {
        Map<String, Object> event = record.value();
        Object amount = event.get("total_amount");
        if (amount != null) {
            upsertNumeric(extractTenant(record), null, "invoice.revenue", null, null,
                    new BigDecimal(amount.toString()));
        }
    }

    private void upsertCount(String tenantId, String branchId, String metricType,
                              String dimKey, String dimValue, long increment) {
        LocalDate today = LocalDate.now();
        DailyMetric metric = new DailyMetric();
        metric.setMetricId(UUIDv7.generate());
        metric.setTenantId(tenantId != null ? tenantId : "unknown");
        metric.setBranchId(branchId);
        metric.setMetricDate(today);
        metric.setMetricType(metricType);
        metric.setDimensionKey(dimKey);
        metric.setDimensionValue(dimValue);
        metric.setCountValue(increment);
        metric.setNumericValue(BigDecimal.ZERO);
        dailyMetricRepository.save(metric);
    }

    private void upsertNumeric(String tenantId, String branchId, String metricType,
                                String dimKey, String dimValue, BigDecimal value) {
        DailyMetric metric = new DailyMetric();
        metric.setMetricId(UUIDv7.generate());
        metric.setTenantId(tenantId != null ? tenantId : "unknown");
        metric.setBranchId(branchId);
        metric.setMetricDate(LocalDate.now());
        metric.setMetricType(metricType);
        metric.setDimensionKey(dimKey);
        metric.setDimensionValue(dimValue);
        metric.setNumericValue(value);
        metric.setCountValue(0L);
        dailyMetricRepository.save(metric);
    }

    private String extractTenant(ConsumerRecord<?, ?> record) {
        if (record.value() instanceof Map) {
            Object tid = ((Map<?, ?>) record.value()).get("tenant_id");
            if (tid != null) return tid.toString();
        }
        return "unknown";
    }
}
