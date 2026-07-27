package com.diagdesk.result.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class AuditEventResponse {
    private String eventType;  // SUBMITTED, AMENDED, VALIDATED, SIGNED_OFF, REJECTED, REPEAT_REQUESTED
    private Integer version;
    private String value;
    private String actor;
    private LocalDateTime timestamp;
    private String notes;
}
