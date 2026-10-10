package com.diagdesk.b2b.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;

@Entity
@Table(name = "b2b_rate_contracts", schema = "b2b")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
public class B2BRateContract extends BaseEntity {

    public enum ContractStatus { ACTIVE, DEACTIVATED }

    @Id
    @Column(name = "contract_id", length = 36)
    private String contractId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "partner_id", nullable = false, length = 36)
    private String partnerId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private ContractStatus status = ContractStatus.ACTIVE;

    @Column(name = "test_rates", columnDefinition = "TEXT")
    private String testRates;
}
