package com.diagdesk.audit.dto.request;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class UpdateBreachRequest {
    private OffsetDateTime notifiedAuthoritiesAt;
    private String resolutionNotes;
    private String status;
}
