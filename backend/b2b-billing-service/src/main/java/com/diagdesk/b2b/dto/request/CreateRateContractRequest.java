package com.diagdesk.b2b.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
public class CreateRateContractRequest {

    @NotBlank
    private String partnerId;

    @NotBlank
    private String name;

    @NotNull
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    private List<Map<String, Object>> testRates;
}
