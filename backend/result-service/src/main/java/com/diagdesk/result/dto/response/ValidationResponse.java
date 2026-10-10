package com.diagdesk.result.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class ValidationResponse {
    private String validationId;
    private Integer level;
    private LocalDateTime validatedAt;
    private String validatedBy;
    private String newStatus;
}
