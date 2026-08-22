package com.diagdesk.catalog.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "tests",
    schema = "catalog",
    indexes = {
        @Index(name = "idx_test_tenant",     columnList = "tenant_id"),
        @Index(name = "idx_test_code",       columnList = "tenant_id, code", unique = true),
        @Index(name = "idx_test_department", columnList = "department_id"),
        @Index(name = "idx_test_nabl_code",  columnList = "nabl_code")
    }
)
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor
public class Test extends BaseEntity {

    @Id
    @Column(name = "test_id", length = 36, updatable = false)
    private String testId;

    @Column(name = "code", length = 30, nullable = false)
    private String code;

    @Column(name = "name", length = 200, nullable = false)
    private String name;

    @Column(name = "method", length = 100)
    private String method;

    @Column(name = "unit", length = 50)
    private String unit;

    @Column(name = "specimen_type", length = 100)
    private String specimenType;

    @Column(name = "container", length = 100)
    private String container;

    @Column(name = "tat_hours")
    private Integer tatHours;

    @Column(name = "department_id", length = 36)
    private String departmentId;

    @Column(name = "is_custom", nullable = false)
    private boolean custom = false;

    /** Null when is_custom = true. */
    @Column(name = "nabl_code", length = 30)
    private String nablCode;

    /** Walk-in / list price before rate-card overrides. */
    @Column(name = "default_price", nullable = false)
    private java.math.BigDecimal defaultPrice = java.math.BigDecimal.ZERO;

    @OneToMany(mappedBy = "test", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<TestReferenceRange> referenceRanges = new ArrayList<>();
}
