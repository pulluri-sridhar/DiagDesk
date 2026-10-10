package com.diagdesk.catalog.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class TestSummaryResponse {
    private String testId;
    private String code;
    private String name;
    private String unit;
    private Integer tatHours;
    private String department;
    private boolean custom;
    private java.math.BigDecimal price;
}
