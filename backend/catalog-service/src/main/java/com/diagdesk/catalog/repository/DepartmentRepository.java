package com.diagdesk.catalog.repository;

import com.diagdesk.catalog.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, String> {
    List<Department> findAllByTenantIdOrderByName(String tenantId);
    Optional<Department> findByTenantIdAndCode(String tenantId, String code);
    boolean existsByTenantIdAndCode(String tenantId, String code);
}
