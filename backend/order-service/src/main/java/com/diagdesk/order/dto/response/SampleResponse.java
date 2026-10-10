package com.diagdesk.order.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data @Builder
public class SampleResponse {
    private String accessionId;
    private String accessionNumber;
    private String barcode;
    private String orderId;
    private String patientId;
    private String specimenType;
    private String container;
    private String status;
    private Instant collectedAt;
    private Instant receivedAt;
    private Instant processedAt;
    private Instant tatDeadline;
    private boolean tatBreached;
    private String labelUrl;
}
