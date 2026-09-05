package com.diagdesk.catalog.controller;

import com.diagdesk.catalog.dto.request.CreateDepartmentRequest;
import com.diagdesk.catalog.dto.response.DepartmentResponse;
import com.diagdesk.catalog.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DepartmentResponse>> list() {
        return ResponseEntity.ok(departmentService.list());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('master.department.manage')")
    public ResponseEntity<DepartmentResponse> create(@Valid @RequestBody CreateDepartmentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(departmentService.create(req));
    }

    @PutMapping("/{departmentId}")
    @PreAuthorize("hasAuthority('master.department.manage')")
    public ResponseEntity<DepartmentResponse> update(@PathVariable String departmentId,
                                                     @Valid @RequestBody CreateDepartmentRequest req) {
        return ResponseEntity.ok(departmentService.update(departmentId, req));
    }
}
