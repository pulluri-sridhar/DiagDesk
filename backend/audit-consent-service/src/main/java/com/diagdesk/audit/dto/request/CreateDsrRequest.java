package com.diagdesk.audit.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateDsrRequest {

    @NotBlank
    private String patientId;

    @NotNull
    private String requestType;

    private String contactPhone;
}
