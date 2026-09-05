package com.diagdesk.b2b.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
public class InvoiceResponse {
    private String invoiceId;
    private String tenantId;
    private String partnerId;
    private String invoiceNumber;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private BigDecimal amountPaid;
    private BigDecimal amountOutstanding;
    private String status;
    private LocalDate dueDate;
    private OffsetDateTime sentAt;
}
