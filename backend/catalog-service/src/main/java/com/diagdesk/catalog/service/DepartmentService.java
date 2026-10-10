package com.diagdesk.catalog.service;

import com.diagdesk.catalog.dto.request.CreateDepartmentRequest;
import com.diagdesk.catalog.dto.response.DepartmentResponse;

import java.util.List;

public interface DepartmentService {
    DepartmentResponse create(CreateDepartmentRequest request);
    List<DepartmentResponse> list();
    DepartmentResponse update(String departmentId, CreateDepartmentRequest request);
}
