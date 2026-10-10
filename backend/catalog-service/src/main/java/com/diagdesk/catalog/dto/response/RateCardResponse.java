package com.diagdesk.catalog.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data @Builder
public class RateCardResponse {
    private String rateCardId;
    private String name;
    private String type;
    private String branchId;
    private String partnerId;
    private String schemeCode;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private List<Item> items;
    private Instant createdAt;
    private Instant updatedAt;

    @Data @Builder
    public static class Item {
        private String itemId;
        private String testId;
        private BigDecimal price;
        private BigDecimal gstRate;
        private boolean gstExempt;
    }
}
