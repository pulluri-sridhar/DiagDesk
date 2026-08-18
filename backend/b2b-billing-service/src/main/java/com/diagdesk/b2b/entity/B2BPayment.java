package com.diagdesk.b2b.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "b2b_payments", schema = "b2b")
@Getter
@Setter
public class B2BPayment {

    public enum PaymentMode { NEFT, RTGS, CHEQUE, UPI }

    @Id
    @Column(name = "payment_id", length = 36)
    private String paymentId;

    @Column(name = "invoice_id", nullable = false, length = 36)
    private String invoiceId;

    @Column(name = "tenant_id", nullable = false, length = 36)
    private String tenantId;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_mode", length = 10)
    private PaymentMode paymentMode;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "recorded_at", nullable = false)
    private OffsetDateTime recordedAt;

    @Column(name = "recorded_by", length = 36)
    private String recordedBy;

    @PrePersist
    void onCreate() {
        if (recordedAt == null) recordedAt = OffsetDateTime.now();
    }
}
