package com.diagdesk.analytics.service;

import com.diagdesk.analytics.entity.AlertRecord;
import com.diagdesk.analytics.entity.DailyMetric;
import com.diagdesk.analytics.entity.DigestSubscription;
import com.diagdesk.analytics.repository.AlertRecordRepository;
import com.diagdesk.analytics.repository.DailyMetricRepository;
import com.diagdesk.analytics.repository.DigestSubscriptionRepository;
import com.diagdesk.common.context.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsQueryServiceImpl implements AnalyticsQueryService {

    private final DailyMetricRepository dailyMetricRepository;
    private final AlertRecordRepository alertRecordRepository;
    private final DigestSubscriptionRepository digestSubscriptionRepository;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getSummary(String branchId) {
        String tenantId = TenantContext.getTenantId();
        LocalDate today = LocalDate.now();

        List<DailyMetric> todayMetrics = dailyMetricRepository
                .findByTenantIdAndMetricDateBetween(tenantId, today, today);

        long registrationsToday = sumCount(todayMetrics, "patient.registered");
        BigDecimal revenueToday = sumNumeric(todayMetrics, "order.revenue");
        BigDecimal revenueMtd = sumNumericMtd(tenantId);
        long tatBreachCount = sumCount(todayMetrics, "tat.breached");
        long pendingSamples = sumCount(todayMetrics, "sample.pending");
        long reportsDeliveredToday = sumCount(todayMetrics, "report.delivered");

        List<AlertRecord> criticalAlerts = alertRecordRepository
                .findByTenantIdAndAcknowledgedFalseOrderByTriggeredAtDesc(tenantId);

        Map<String, Object> result = new HashMap<>();
        result.put("registrations_today", registrationsToday);
        result.put("revenue_today", revenueToday);
        result.put("revenue_mtd", revenueMtd);
        result.put("tat_breach_count", tatBreachCount);
        result.put("pending_samples", pendingSamples);
        result.put("reports_delivered_today", reportsDeliveredToday);
        result.put("critical_alerts_unack", criticalAlerts.size());
        result.put("top_alerts", criticalAlerts.stream().limit(3).map(a -> Map.of(
                "alert_id", a.getAlertId(),
                "type", a.getType(),
                "severity", a.getSeverity() != null ? a.getSeverity() : "MEDIUM",
                "message", a.getMessage() != null ? a.getMessage() : ""
        )).collect(Collectors.toList()));
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getRevenue(String branchId, String period, String groupBy) {
        String tenantId = TenantContext.getTenantId();
        LocalDate[] range = periodToRange(period);
        List<DailyMetric> metrics = dailyMetricRepository
                .findByTenantIdAndMetricTypeAndMetricDateBetween(tenantId, "order.revenue", range[0], range[1]);

        Map<String, BigDecimal> grouped = new HashMap<>();
        for (DailyMetric m : metrics) {
            String key = groupBy != null && groupBy.equals("department")
                    ? (m.getDimensionKey() != null ? m.getDimensionKey() : "UNKNOWN")
                    : m.getMetricDate().toString();
            grouped.merge(key, m.getNumericValue() != null ? m.getNumericValue() : BigDecimal.ZERO, BigDecimal::add);
        }

        BigDecimal total = grouped.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> result = new HashMap<>();
        result.put("period", period);
        result.put("total_revenue", total);
        result.put("group_by", groupBy);
        result.put("breakdown", grouped);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getTat(String branchId, String deptId, String period) {
        String tenantId = TenantContext.getTenantId();
        LocalDate[] range = periodToRange(period);
        List<DailyMetric> metrics = dailyMetricRepository
                .findByTenantIdAndMetricTypeAndMetricDateBetween(tenantId, "tat.breached", range[0], range[1]);

        long totalBreaches = metrics.stream()
                .mapToLong(m -> m.getCountValue() != null ? m.getCountValue() : 0L).sum();

        Map<String, Object> result = new HashMap<>();
        result.put("period", period);
        result.put("branch_id", branchId);
        result.put("dept_id", deptId);
        result.put("total_tat_breaches", totalBreaches);
        result.put("avg_tat_hours", 0);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getSamples(String branchId, String period) {
        String tenantId = TenantContext.getTenantId();
        LocalDate[] range = periodToRange(period);
        List<DailyMetric> rejected = dailyMetricRepository
                .findByTenantIdAndMetricTypeAndMetricDateBetween(tenantId, "sample.rejected", range[0], range[1]);

        long totalRejected = rejected.stream()
                .mapToLong(m -> m.getCountValue() != null ? m.getCountValue() : 0L).sum();

        Map<String, Object> result = new HashMap<>();
        result.put("period", period);
        result.put("total_rejected", totalRejected);
        result.put("rejection_rate_pct", 0.0);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getReferrals(String period, int topN, String branchId) {
        String tenantId = TenantContext.getTenantId();
        LocalDate[] range = periodToRange(period);
        List<DailyMetric> metrics = dailyMetricRepository
                .findByTenantIdAndMetricTypeAndMetricDateBetween(tenantId, "referral.orders", range[0], range[1]);

        Map<String, Long> bySource = new HashMap<>();
        for (DailyMetric m : metrics) {
            String key = m.getDimensionKey() != null ? m.getDimensionKey() : "UNKNOWN";
            bySource.merge(key, m.getCountValue() != null ? m.getCountValue() : 0L, Long::sum);
        }

        List<Map<String, Object>> top = bySource.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(topN)
                .map(e -> Map.<String, Object>of("source_id", e.getKey(), "order_count", e.getValue()))
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("period", period);
        result.put("top_referrers", top);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getGeography(String branchId, String period) {
        String tenantId = TenantContext.getTenantId();
        LocalDate[] range = periodToRange(period);
        List<DailyMetric> metrics = dailyMetricRepository
                .findByTenantIdAndMetricTypeAndMetricDateBetween(tenantId, "patient.pincode", range[0], range[1]);

        Map<String, Long> byPincode = new HashMap<>();
        for (DailyMetric m : metrics) {
            String key = m.getDimensionKey() != null ? m.getDimensionKey() : "UNKNOWN";
            byPincode.merge(key, m.getCountValue() != null ? m.getCountValue() : 0L, Long::sum);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("period", period);
        result.put("by_pincode", byPincode);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getTestPerformance(String period, String deptId) {
        String tenantId = TenantContext.getTenantId();
        LocalDate[] range = periodToRange(period);
        List<DailyMetric> metrics = dailyMetricRepository
                .findByTenantIdAndMetricTypeAndMetricDateBetween(tenantId, "test.ordered", range[0], range[1]);

        Map<String, Long> byTest = new HashMap<>();
        for (DailyMetric m : metrics) {
            String key = m.getDimensionKey() != null ? m.getDimensionKey() : "UNKNOWN";
            byTest.merge(key, m.getCountValue() != null ? m.getCountValue() : 0L, Long::sum);
        }

        List<Map<String, Object>> topTests = byTest.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .map(e -> Map.<String, Object>of("test_id", e.getKey(), "order_count", e.getValue()))
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("period", period);
        result.put("dept_id", deptId);
        result.put("top_tests", topTests);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getOperations(String branchId, String period) {
        String tenantId = TenantContext.getTenantId();
        LocalDate[] range = periodToRange(period);
        List<DailyMetric> metrics = dailyMetricRepository
                .findByTenantIdAndMetricTypeAndMetricDateBetween(tenantId, "order.created", range[0], range[1]);

        long totalOrders = metrics.stream()
                .mapToLong(m -> m.getCountValue() != null ? m.getCountValue() : 0L).sum();

        Map<String, Object> result = new HashMap<>();
        result.put("period", period);
        result.put("total_orders", totalOrders);
        result.put("avg_orders_per_day", metrics.isEmpty() ? 0 : totalOrders / metrics.size());
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getFinance(String period) {
        String tenantId = TenantContext.getTenantId();
        LocalDate[] range = periodToRange(period);
        List<DailyMetric> revenueMetrics = dailyMetricRepository
                .findByTenantIdAndMetricTypeAndMetricDateBetween(tenantId, "order.revenue", range[0], range[1]);

        BigDecimal totalRevenue = revenueMetrics.stream()
                .map(m -> m.getNumericValue() != null ? m.getNumericValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new HashMap<>();
        result.put("period", period);
        result.put("total_revenue", totalRevenue);
        result.put("total_outstanding", BigDecimal.ZERO);
        result.put("collection_efficiency_pct", 0.0);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getAlerts() {
        String tenantId = TenantContext.getTenantId();
        List<AlertRecord> alerts = alertRecordRepository
                .findByTenantIdAndAcknowledgedFalseOrderByTriggeredAtDesc(tenantId);

        Map<String, Object> result = new HashMap<>();
        result.put("unacknowledged_count", alerts.size());
        result.put("alerts", alerts.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("alert_id", a.getAlertId());
            m.put("type", a.getType());
            m.put("severity", a.getSeverity());
            m.put("message", a.getMessage());
            m.put("triggered_at", a.getTriggeredAt());
            return m;
        }).collect(Collectors.toList()));
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> acknowledgeAlert(String alertId) {
        String tenantId = TenantContext.getTenantId();
        AlertRecord alert = alertRecordRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Alert not found: " + alertId));
        alert.setAcknowledged(true);
        alert.setAcknowledgedAt(OffsetDateTime.now());
        alertRecordRepository.save(alert);
        return Map.of("alert_id", alertId, "acknowledged", true);
    }

    @Override
    @Transactional
    public String createDigest(Map<String, Object> req) {
        String tenantId = TenantContext.getTenantId();
        DigestSubscription sub = new DigestSubscription();
        sub.setSubscriptionId(UUIDv7.generate());
        sub.setTenantId(tenantId);
        sub.setUserId((String) req.get("user_id"));
        sub.setFrequency((String) req.getOrDefault("frequency", "daily"));
        sub.setChannels((String) req.getOrDefault("channels", "email"));
        sub.setSendTime((String) req.getOrDefault("send_time", "08:00"));
        sub.setTimezone((String) req.getOrDefault("timezone", "Asia/Kolkata"));
        sub.setActive(true);
        digestSubscriptionRepository.save(sub);
        return sub.getSubscriptionId();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listDigests() {
        String tenantId = TenantContext.getTenantId();
        return digestSubscriptionRepository.findByTenantIdAndActiveTrue(tenantId).stream()
                .map(s -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("subscription_id", s.getSubscriptionId());
                    m.put("user_id", s.getUserId());
                    m.put("frequency", s.getFrequency());
                    m.put("channels", s.getChannels());
                    m.put("send_time", s.getSendTime());
                    m.put("timezone", s.getTimezone());
                    m.put("active", s.isActive());
                    return m;
                }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteDigest(String subscriptionId) {
        digestSubscriptionRepository.findById(subscriptionId).ifPresent(s -> {
            s.setActive(false);
            digestSubscriptionRepository.save(s);
        });
    }

    private long sumCount(List<DailyMetric> metrics, String type) {
        return metrics.stream()
                .filter(m -> type.equals(m.getMetricType()))
                .mapToLong(m -> m.getCountValue() != null ? m.getCountValue() : 0L)
                .sum();
    }

    private BigDecimal sumNumeric(List<DailyMetric> metrics, String type) {
        return metrics.stream()
                .filter(m -> type.equals(m.getMetricType()))
                .map(m -> m.getNumericValue() != null ? m.getNumericValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumNumericMtd(String tenantId) {
        LocalDate firstOfMonth = LocalDate.now().withDayOfMonth(1);
        List<DailyMetric> mtd = dailyMetricRepository
                .findByTenantIdAndMetricTypeAndMetricDateBetween(tenantId, "order.revenue", firstOfMonth, LocalDate.now());
        return mtd.stream()
                .map(m -> m.getNumericValue() != null ? m.getNumericValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private LocalDate[] periodToRange(String period) {
        LocalDate now = LocalDate.now();
        return switch (period != null ? period : "today") {
            case "today" -> new LocalDate[]{now, now};
            case "week" -> new LocalDate[]{now.minusDays(6), now};
            case "month" -> new LocalDate[]{now.withDayOfMonth(1), now};
            case "quarter" -> new LocalDate[]{now.minusMonths(3), now};
            case "year" -> new LocalDate[]{now.withDayOfYear(1), now};
            default -> new LocalDate[]{now.minusDays(29), now};
        };
    }
}
