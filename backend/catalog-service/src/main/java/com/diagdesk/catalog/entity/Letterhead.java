package com.diagdesk.catalog.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(
    name = "letterheads",
    schema = "catalog",
    indexes = {
        @Index(name = "idx_lh_tenant", columnList = "tenant_id"),
        @Index(name = "idx_lh_branch", columnList = "branch_id")
    }
)
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor
public class Letterhead extends BaseEntity {

    @Id
    @Column(name = "letterhead_id", length = 36, updatable = false)
    private String letterheadId;

    @Column(name = "branch_id", length = 36)
    private String branchId;

    /** URL to logo in object storage (S3/MinIO). */
    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "header_html", columnDefinition = "TEXT")
    private String headerHtml;

    @Column(name = "footer_html", columnDefinition = "TEXT")
    private String footerHtml;

    @Column(name = "margin_top_mm")
    private Integer marginTopMm = 20;

    @Column(name = "margin_bottom_mm")
    private Integer marginBottomMm = 20;
}
