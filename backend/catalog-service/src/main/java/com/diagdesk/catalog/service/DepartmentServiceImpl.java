package com.diagdesk.catalog.service;

import com.diagdesk.catalog.dto.request.CreateDepartmentRequest;
import com.diagdesk.catalog.dto.response.DepartmentResponse;
import com.diagdesk.catalog.entity.Department;
import com.diagdesk.catalog.repository.DepartmentRepository;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository departmentRepository;

    @Override
    @Transactional
    public DepartmentResponse create(CreateDepartmentRequest req) {
        String tenantId = requireTenant();
        if (departmentRepository.existsByTenantIdAndCode(tenantId, req.getCode())) {
            throw new DiagDeskException(ErrorCode.CONFLICT, "Department code already exists: " + req.getCode());
        }

        Department dept = new Department();
        dept.setDepartmentId(UUIDv7.generateAsString());
        dept.setTenantId(tenantId);
        dept.setName(req.getName());
        dept.setCode(req.getCode());
        dept.setSectionHeadId(req.getSectionHeadId());
        departmentRepository.save(dept);
        return toResponse(dept);
    }

    @Override
    public List<DepartmentResponse> list() {
        return departmentRepository.findAllByTenantIdOrderByName(requireTenant())
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public DepartmentResponse update(String departmentId, CreateDepartmentRequest req) {
        Department dept = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND, "departmentId=" + departmentId));
        dept.setName(req.getName());
        dept.setCode(req.getCode());
        dept.setSectionHeadId(req.getSectionHeadId());
        departmentRepository.save(dept);
        return toResponse(dept);
    }

    private String requireTenant() {
        String t = TenantContext.getTenantId();
        if (t == null || t.isBlank()) throw new DiagDeskException(ErrorCode.TENANT_REQUIRED);
        return t;
    }

    private DepartmentResponse toResponse(Department d) {
        return DepartmentResponse.builder()
                .departmentId(d.getDepartmentId()).name(d.getName())
                .code(d.getCode()).sectionHeadId(d.getSectionHeadId())
                .build();
    }
}
