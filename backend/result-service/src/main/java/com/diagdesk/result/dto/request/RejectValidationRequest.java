package com.diagdesk.result.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectValidationRequest {

    @NotBlank
    private String reason;
}
