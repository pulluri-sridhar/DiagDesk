package com.diagdesk.audit.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class ConsentResponse {
    private String consentId;
    private String tenantId;
    private String patientId;
    private String consentType;
    private String purpose;
    private String languageCode;
    private String consentTextVersion;
    private String capturedVia;
    private String ipAddress;
    private String status;
    private OffsetDateTime capturedAt;
    private OffsetDateTime revokedAt;
    private String revokedBy;
    private String hash;
}
