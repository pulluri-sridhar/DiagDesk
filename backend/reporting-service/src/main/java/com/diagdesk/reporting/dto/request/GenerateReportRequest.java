package com.diagdesk.reporting.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GenerateReportRequest {
    @NotBlank private String orderId;
    private String templateId;
    private String letterheadId;
    private boolean previewOnly = false;
}
