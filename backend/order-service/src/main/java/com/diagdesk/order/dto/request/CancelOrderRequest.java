package com.diagdesk.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CancelOrderRequest {
    @NotBlank private String reason;
    private String cancelledBy;
}
