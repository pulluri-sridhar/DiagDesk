package com.diagdesk.order.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data @Builder
public class TatBreachResponse {
    private String orderId;
    private String orderNumber;
    private String patientId;
    private String priority;
    private String status;
    private Instant estimatedTat;
    private long breachMinutes;
}
