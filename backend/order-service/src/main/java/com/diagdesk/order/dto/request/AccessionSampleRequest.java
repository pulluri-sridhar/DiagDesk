package com.diagdesk.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.Instant;

@Data
public class AccessionSampleRequest {
    @NotBlank private String orderId;
    private String specimenType;
    private String container;
    private String collectedBy;
    private Instant collectedAt;
    private String collectionLocation = "counter";
}
