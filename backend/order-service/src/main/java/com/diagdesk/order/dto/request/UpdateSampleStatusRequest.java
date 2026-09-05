package com.diagdesk.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateSampleStatusRequest {
    @NotBlank private String status;
    private String updatedBy;
    private String notes;
}
