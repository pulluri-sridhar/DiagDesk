package com.diagdesk.reporting.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SignoffReportRequest {
    @NotBlank private String pin;
    private String signatureType = "digital";
    private String notes;
}
