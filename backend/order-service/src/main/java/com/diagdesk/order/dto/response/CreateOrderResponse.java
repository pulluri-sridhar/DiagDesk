package com.diagdesk.order.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data @Builder
public class CreateOrderResponse {
    private String orderId;
    private String orderNumber;
    private List<String> accessionNumbers;
    private String invoiceId;
    private Instant estimatedTat;
    private String status;
}
