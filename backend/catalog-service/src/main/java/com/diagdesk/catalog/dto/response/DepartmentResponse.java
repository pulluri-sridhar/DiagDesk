package com.diagdesk.catalog.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class DepartmentResponse {
    private String departmentId;
    private String name;
    private String code;
    private String sectionHeadId;
}
