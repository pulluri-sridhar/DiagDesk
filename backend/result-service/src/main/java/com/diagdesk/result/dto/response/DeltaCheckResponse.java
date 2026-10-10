package com.diagdesk.result.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data @Builder
public class DeltaCheckResponse {
    private BigDecimal deltaPct;
    private String previousValue;
    private String previousDate;
    private boolean deltaFlag;
    private String alertMessage;
}
