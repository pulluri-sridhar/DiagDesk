package com.diagdesk.catalog.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data @Builder
public class RateCardSummaryResponse {
    private String rateCardId;
    private String name;
    private String type;
    private String branchId;
    private String partnerId;
    private String schemeCode;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private int itemCount;
}
