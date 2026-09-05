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
    name = "panels",
    schema = "catalog",
    indexes = {
        @Index(name = "idx_panel_tenant", columnList = "tenant_id"),
        @Index(name = "idx_panel_type",   columnList = "tenant_id, type")
    }
)
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor
public class Panel extends BaseEntity {

    @Id
    @Column(name = "panel_id", length = 36, updatable = false)
    private String panelId;

    @Column(name = "name", length = 200, nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 10, nullable = false)
    private PanelType type;

    @Column(name = "description", length = 500)
    private String description;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        schema = "catalog",
        name = "panel_tests",
        joinColumns = @JoinColumn(name = "panel_id"),
        inverseJoinColumns = @JoinColumn(name = "test_id")
    )
    private List<Test> tests = new ArrayList<>();

    public enum PanelType { panel, package_ }
}
