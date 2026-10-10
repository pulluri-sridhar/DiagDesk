package com.diagdesk.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateDepartmentRequest {
    @NotBlank private String name;
    @NotBlank private String code;
    private String sectionHeadId;
}
