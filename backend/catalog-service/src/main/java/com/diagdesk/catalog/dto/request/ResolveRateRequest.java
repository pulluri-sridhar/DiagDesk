package com.diagdesk.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResolveRateRequest {
    @NotBlank private String testId;
    @NotBlank private String branchId;
    @NotBlank private String patientType; // cash | b2b | insurance
    private String b2bPartnerId;
    private String schemeCode;
}
