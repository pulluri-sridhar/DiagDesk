package com.diagdesk.patient.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;

/** Response for POST /v1/patients/{id}/consent and items in the consent list. */
@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConsentResponse {
    String consentId;
    String type;
    String purpose;
    String status;
    String capturedAt;
    String hash;
    Instant revokedAt;
}
