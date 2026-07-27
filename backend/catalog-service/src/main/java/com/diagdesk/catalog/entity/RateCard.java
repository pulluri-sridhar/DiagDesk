package com.diagdesk.catalog.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "rate_cards",
    schema = "catalog",
    indexes = {
        @Index(name = "idx_rc_tenant",     columnList = "tenant_id"),
        @Index(name = "idx_rc_type",       columnList = "tenant_id, type"),
        @Index(name = "idx_rc_branch",     columnList = "branch_id"),
        @Index(name = "idx_rc_partner",    columnList = "partner_id"),
        @Index(name = "idx_rc_scheme",     columnList = "scheme_code")
    }
)
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor
public class RateCard extends BaseEntity {

    @Id
    @Column(name = "rate_card_id", length = 36, updatable = false)
    private String rateCardId;

    @Column(name = "name", length = 200, nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 15, nullable = false)
    private RateCardType type;

    /** For type=branch */
    @Column(name = "branch_id", length = 36)
    private String branchId;

    /** For type=b2b_partner */
    @Column(name = "partner_id", length = 36)
    private String partnerId;

    /** For type=scheme */
    @Column(name = "scheme_code", length = 30)
    private String schemeCode;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @OneToMany(mappedBy = "rateCard", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<RateCardItem> items = new ArrayList<>();

    public enum RateCardType { branch, b2b_partner, scheme }
}
