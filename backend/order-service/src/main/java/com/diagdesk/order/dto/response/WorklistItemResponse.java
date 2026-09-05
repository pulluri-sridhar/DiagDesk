package com.diagdesk.order.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data @Builder
public class WorklistItemResponse {
    private String accessionId;
    private String accessionNumber;
    private String orderId;
    private String patientId;
    private String specimenType;
    private String container;
    private String priority;
    private String status;
    private Instant tatDeadline;
    private boolean tatBreached;
}
