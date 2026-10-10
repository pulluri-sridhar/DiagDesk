package com.diagdesk.catalog.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data @Builder
public class ReferenceRangeResponse {
    private String rangeId;
    private Integer ageMinYears;
    private Integer ageMaxYears;
    private String gender;
    private BigDecimal lowerLimit;
    private BigDecimal upperLimit;
    private BigDecimal criticalLow;
    private BigDecimal criticalHigh;
    private String unit;
}
