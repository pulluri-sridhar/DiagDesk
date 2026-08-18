package com.diagdesk.reporting.repository;

import com.diagdesk.reporting.entity.ReportTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportTemplateRepository extends JpaRepository<ReportTemplate, String> {
    List<ReportTemplate> findByDepartmentId(String departmentId);
}
