package com.diagdesk.result.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubmitResultRequest {

    @NotBlank
    private String accessionId;

    @NotBlank
    private String testId;

    @NotBlank
    private String value;

    private String unit;
    private String method;

    @NotNull
    private String source; // ANALYZER or MANUAL

    private String enteredBy;
    private String rawHl7Segment;

    // Populated by Kafka consumer path from device-gateway (carries test code before ID lookup)
    private String testCode;
}
