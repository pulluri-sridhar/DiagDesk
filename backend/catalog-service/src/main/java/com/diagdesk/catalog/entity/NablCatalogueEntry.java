package com.diagdesk.catalog.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

/**
 * Global NABL test catalogue — shared across all tenants, seeded via Flyway.
 * Not tenant-isolated; tenants import from this into their own test master.
 */
@Entity
@Table(name = "nabl_catalogue", schema = "catalog")
@Getter @Setter @NoArgsConstructor
public class NablCatalogueEntry {

    @Id
    @Column(name = "nabl_code", length = 30)
    private String nablCode;

    @Column(name = "name", length = 200, nullable = false)
    private String name;

    @Column(name = "method", length = 100)
    private String method;

    @Column(name = "specimen_type", length = 100)
    private String specimenType;

    @Column(name = "category", length = 50)
    private String category;

    @Column(name = "unit", length = 50)
    private String unit;

    @Column(name = "container", length = 100)
    private String container;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "default_reference_ranges", columnDefinition = "jsonb")
    private List<DefaultReferenceRange> defaultReferenceRanges;

    @Getter @Setter @NoArgsConstructor
    public static class DefaultReferenceRange {
        private String gender;
        private Integer ageMinYears;
        private Integer ageMaxYears;
        private Double lowerLimit;
        private Double upperLimit;
        private Double criticalLow;
        private Double criticalHigh;
        private String unit;
    }
}
