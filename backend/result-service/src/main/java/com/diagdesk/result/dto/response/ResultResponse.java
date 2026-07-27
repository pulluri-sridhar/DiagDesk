package com.diagdesk.result.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data @Builder
public class ResultResponse {
    private String resultId;
    private String accessionId;
    private String testId;
    private String orderId;
    private String patientId;
    private String value;
    private String unit;
    private String method;
    private String source;
    private List<String> flags;
    private String referenceRange;
    private String validationStatus;
    private Integer version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
