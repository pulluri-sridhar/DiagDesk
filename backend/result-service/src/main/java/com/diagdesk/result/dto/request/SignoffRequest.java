package com.diagdesk.result.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SignoffRequest {

    @NotBlank
    private String signatureType; // digital or pin

    private String pin; // required when signatureType = pin

    private String notes;
}
