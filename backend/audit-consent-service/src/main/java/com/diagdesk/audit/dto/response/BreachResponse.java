package com.diagdesk.audit.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class BreachResponse {
    private String breachId;
    private String tenantId;
    private String title;
    private String description;
    private Integer affectedPatientsCount;
    private String dataCategories;
    private OffsetDateTime detectedAt;
    private String severity;
    private String status;
    private OffsetDateTime dpdpDeadline;
    private OffsetDateTime certInDeadline;
    private OffsetDateTime notifiedAuthoritiesAt;
    private String resolutionNotes;
    private OffsetDateTime createdAt;
}
