package com.diagdesk.catalog.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(
    name = "test_reference_ranges",
    schema = "catalog",
    indexes = {
        @Index(name = "idx_refrange_test", columnList = "test_id")
    }
)
@Getter @Setter @NoArgsConstructor
public class TestReferenceRange {

    @Id
    @Column(name = "range_id", length = 36, updatable = false)
    private String rangeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "test_id", nullable = false)
    private Test test;

    @Column(name = "age_min_years")
    private Integer ageMinYears;

    @Column(name = "age_max_years")
    private Integer ageMaxYears;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 10, nullable = false)
    private Gender gender = Gender.all;

    @Column(name = "lower_limit", precision = 12, scale = 4)
    private BigDecimal lowerLimit;

    @Column(name = "upper_limit", precision = 12, scale = 4)
    private BigDecimal upperLimit;

    @Column(name = "critical_low", precision = 12, scale = 4)
    private BigDecimal criticalLow;

    @Column(name = "critical_high", precision = 12, scale = 4)
    private BigDecimal criticalHigh;

    @Column(name = "unit", length = 50)
    private String unit;

    public enum Gender { all, male, female }
}
