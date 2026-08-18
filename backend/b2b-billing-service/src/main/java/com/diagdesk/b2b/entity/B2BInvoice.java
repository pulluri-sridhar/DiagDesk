package com.diagdesk.b2b.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "b2b_invoices", schema = "b2b")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
public class B2BInvoice extends BaseEntity {

    public enum InvoiceStatus { DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE }

    @Id
    @Column(name = "invoice_id", length = 36)
    private String invoiceId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "partner_id", nullable = false, length = 36)
    private String partnerId;

    @Column(name = "invoice_number", unique = true, length = 50)
    private String invoiceNumber;

    @Column(name = "period_from")
    private LocalDate periodFrom;

    @Column(name = "period_to")
    private LocalDate periodTo;

    @Column(name = "subtotal", precision = 15, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "tax_amount", precision = 15, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "amount_paid", precision = 15, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "amount_outstanding", precision = 15, scale = 2)
    private BigDecimal amountOutstanding = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private InvoiceStatus status = InvoiceStatus.DRAFT;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;
}
