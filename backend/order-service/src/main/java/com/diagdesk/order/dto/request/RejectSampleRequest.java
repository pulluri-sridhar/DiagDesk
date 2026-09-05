package com.diagdesk.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectSampleRequest {
    @NotBlank private String rejectionReasonCode;
    private String notes;
    private boolean reCollectionRequired = true;
    private String rejectedBy;
}
