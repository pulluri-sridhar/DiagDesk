package com.diagdesk.b2b.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;

@Entity
@Table(name = "b2b_partners", schema = "b2b")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
public class B2BPartner extends BaseEntity {

    public enum PartnerType { HOSPITAL, CLINIC, CORPORATE, TPA, REFERENCE_LAB, COLLECTION_FRANCHISE }
    public enum BillingCycle { MONTHLY, FORTNIGHTLY, WEEKLY }

    @Id
    @Column(name = "partner_id", length = 36)
    private String partnerId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private PartnerType type;

    @Column(name = "contact_name", length = 100)
    private String contactName;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(name = "contact_email", length = 200)
    private String contactEmail;

    @Column(name = "address_line1", length = 300)
    private String addressLine1;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", length = 50)
    private String state;

    @Column(name = "pincode", length = 10)
    private String pincode;

    @Column(name = "gst_number", length = 20)
    private String gstNumber;

    @Column(name = "credit_limit", precision = 15, scale = 2)
    private BigDecimal creditLimit = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", length = 20)
    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    @Column(name = "credit_days")
    private int creditDays = 30;

    @Column(name = "account_number", length = 50, unique = true)
    private String accountNumber;
}
