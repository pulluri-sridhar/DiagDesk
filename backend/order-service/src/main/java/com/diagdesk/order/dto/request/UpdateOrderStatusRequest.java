package com.diagdesk.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateOrderStatusRequest {
    @NotBlank private String status;
    private String updatedBy;
}
