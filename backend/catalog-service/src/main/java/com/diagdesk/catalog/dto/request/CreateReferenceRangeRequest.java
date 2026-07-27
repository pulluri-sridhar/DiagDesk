package com.diagdesk.catalog.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateReferenceRangeRequest {
    private Integer ageMinYears;
    private Integer ageMaxYears;
    private String gender = "all";
    private BigDecimal lowerLimit;
    private BigDecimal upperLimit;
    private BigDecimal criticalLow;
    private BigDecimal criticalHigh;
    @NotNull private String unit;
}
