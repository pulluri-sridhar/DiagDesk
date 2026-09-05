package com.diagdesk.reporting.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "report_templates", schema = "reporting")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor
public class ReportTemplate extends BaseEntity {

    @Id
    @Column(name = "template_id")
    private String templateId;

    @Column(nullable = false)
    private String name;

    @Column(name = "department_id")
    private String departmentId;

    @Column(name = "letterhead_id")
    private String letterheadId;

    @Column(name = "template_html", columnDefinition = "TEXT")
    private String templateHtml;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TemplateFormat format = TemplateFormat.STANDARD;

    public enum TemplateFormat { STANDARD, CUMULATIVE }
}
