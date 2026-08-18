package com.diagdesk.reporting.service;

import com.diagdesk.reporting.dto.request.*;
import com.diagdesk.reporting.dto.response.DeliveryStatusResponse;
import com.diagdesk.reporting.dto.response.ReportResponse;

import java.util.List;
import java.util.Map;

public interface ReportService {
    ReportResponse generate(GenerateReportRequest req);
    ReportResponse getById(String reportId);
    ReportResponse edit(String reportId, EditReportRequest req);
    ReportResponse signoff(String reportId, SignoffReportRequest req);
    List<Map<String, String>> deliver(String reportId, DeliverReportRequest req);
    DeliveryStatusResponse deliveryStatus(String reportId);
    Map<String, Object> print(String reportId, PrintReportRequest req);
    List<Map<String, Object>> printLog(String reportId);
    List<ReportResponse> listByPatient(String patientId);
}
