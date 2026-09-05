package com.diagdesk.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class CreateRateCardRequest {
    @NotBlank private String name;
    @NotBlank private String type;
    private String branchId;
    private String partnerId;
    private String schemeCode;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    @NotEmpty private List<Item> items;

    @Data
    public static class Item {
        @NotBlank private String testId;
        private BigDecimal price = BigDecimal.ZERO;
        private BigDecimal gstRate = BigDecimal.ZERO;
        private boolean gstExempt = false;
    }
}
