package com.diagdesk.result.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AmendResultRequest {

    @NotBlank
    private String value;

    private String unit;

    @NotBlank
    private String amendmentReason;
}
