package com.diagdesk.reporting.dto.response;

import lombok.Data;

import java.time.Instant;

@Data
public class ReportResponse {
    private String reportId;
    private String orderId;
    private String patientId;
    private String status;
    private Integer version;
    private Integer printCount;
    private String signedBy;
    private Instant signedAt;
    private String pdfUrl;
    private String previewUrl;
    private Instant createdAt;
}
