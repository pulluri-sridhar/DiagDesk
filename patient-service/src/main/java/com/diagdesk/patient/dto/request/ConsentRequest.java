package com.diagdesk.patient.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/** Request body for POST /v1/patients/{id}/consent. */
@Data
public class ConsentRequest {

    @NotBlank
    @Pattern(regexp = "data_processing|marketing|research",
             message = "Consent type must be data_processing, marketing, or research")
    private String consentType;

    @NotBlank(message = "Purpose is required")
    private String purpose;

    @Pattern(regexp = "en|hi|te|kn|ta|mr|bn|gu|ml|pa",
             message = "Language code must be a valid ISO 639-1 code supported by DiagDesk")
    private String languageCode;

    @NotBlank(message = "Consent text version is required for audit trail")
    private String consentTextVersion;

    private String ipAddress;

    @NotBlank
    @Pattern(regexp = "counter|kiosk|app|patient_app",
             message = "capturedVia must be counter, kiosk, app, or patient_app")
    private String capturedVia;
}
