package com.diagdesk.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CreateTestRequest {
    @NotBlank private String code;
    @NotBlank private String name;
    private String method;
    private String unit;
    private String specimenType;
    private String container;
    @Positive private Integer tatHours;
    private String departmentId;
    private boolean custom = false;
    private String nablCode;
}
