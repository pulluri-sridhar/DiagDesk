package com.diagdesk.analytics.service;

import java.util.List;
import java.util.Map;

public interface AnalyticsQueryService {

    Map<String, Object> getSummary(String branchId);

    Map<String, Object> getRevenue(String branchId, String period, String groupBy);

    Map<String, Object> getTat(String branchId, String deptId, String period);

    Map<String, Object> getSamples(String branchId, String period);

    Map<String, Object> getReferrals(String period, int topN, String branchId);

    Map<String, Object> getGeography(String branchId, String period);

    Map<String, Object> getTestPerformance(String period, String deptId);

    Map<String, Object> getOperations(String branchId, String period);

    Map<String, Object> getFinance(String period);

    Map<String, Object> getAlerts();

    Map<String, Object> acknowledgeAlert(String alertId);

    String createDigest(Map<String, Object> req);

    List<Map<String, Object>> listDigests();

    void deleteDigest(String subscriptionId);
}
