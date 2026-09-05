package com.diagdesk.result.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class CriticalAlertResponse {
    private String resultId;
    private String testName;   // populated from cross-service lookup or stored value
    private String patientId;
    private String value;
    private String flag;       // CRITICAL_HIGH or CRITICAL_LOW
    private LocalDateTime createdAt;
}
