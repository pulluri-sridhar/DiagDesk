package com.diagdesk.b2b.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "professional_service_contracts", schema = "b2b")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
public class ProfessionalServiceContract extends BaseEntity {

    public enum FeeType { FIXED, PER_SERVICE }
    public enum ContractStatus { ACTIVE, TERMINATED }

    @Id
    @Column(name = "contract_id", length = 36)
    private String contractId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "professional_id", nullable = false, length = 36)
    private String professionalId;

    @Column(name = "professional_name", nullable = false, length = 200)
    private String professionalName;

    @Column(name = "service_description", columnDefinition = "TEXT")
    private String serviceDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "fee_type", nullable = false, length = 20)
    private FeeType feeType;

    @Column(name = "amount", precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "frequency", length = 20)
    private String frequency;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private ContractStatus status = ContractStatus.ACTIVE;

    @Column(name = "compliance_flag", nullable = false)
    private boolean complianceFlag = false;
}
