package com.diagdesk.audit.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class DsrResponse {
    private String dsrId;
    private String tenantId;
    private String patientId;
    private String requestType;
    private String contactPhone;
    private String status;
    private OffsetDateTime receivedAt;
    private OffsetDateTime estimatedCompletion;
    private OffsetDateTime completedAt;
    private String notes;
}
