package com.diagdesk.catalog.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data @Builder
public class ResolvedRateResponse {
    private BigDecimal price;
    private BigDecimal gstRate;
    private boolean gstExempt;
    private String rateCardId;
    private String rateCardName;
}
