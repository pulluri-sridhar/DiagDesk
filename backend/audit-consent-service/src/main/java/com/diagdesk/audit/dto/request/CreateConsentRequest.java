package com.diagdesk.audit.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class CreateConsentRequest {

    @NotBlank
    private String patientId;

    @NotNull
    private String consentType;

    private String purpose;

    private String languageCode = "en";

    private String consentTextVersion;

    @NotBlank
    private String capturedVia;

    private String ipAddress;

    private OffsetDateTime capturedAt;
}
