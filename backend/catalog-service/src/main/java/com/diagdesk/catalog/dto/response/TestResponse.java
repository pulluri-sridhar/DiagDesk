package com.diagdesk.catalog.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data @Builder
public class TestResponse {
    private String testId;
    private String code;
    private String name;
    private String method;
    private String unit;
    private String specimenType;
    private String container;
    private Integer tatHours;
    private String departmentId;
    private boolean custom;
    private String nablCode;
    private List<ReferenceRangeResponse> referenceRanges;
    private Instant createdAt;
    private Instant updatedAt;
}
