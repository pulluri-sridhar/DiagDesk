package com.diagdesk.b2b.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateProfessionalContractRequest {

    @NotBlank
    private String professionalId;

    @NotBlank
    private String professionalName;

    private String serviceDescription;

    @NotNull
    private String feeType;

    private BigDecimal amount;

    private String frequency;

    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;
}
