package com.diagdesk.catalog.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(
    name = "departments",
    schema = "catalog",
    indexes = {
        @Index(name = "idx_dept_tenant", columnList = "tenant_id"),
        @Index(name = "idx_dept_code",   columnList = "tenant_id, code", unique = true)
    }
)
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor
public class Department extends BaseEntity {

    @Id
    @Column(name = "department_id", length = 36, updatable = false)
    private String departmentId;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Column(name = "code", length = 20, nullable = false)
    private String code;

    /** Optional FK to users table (cross-service — stored as plain ID). */
    @Column(name = "section_head_id", length = 36)
    private String sectionHeadId;
}
