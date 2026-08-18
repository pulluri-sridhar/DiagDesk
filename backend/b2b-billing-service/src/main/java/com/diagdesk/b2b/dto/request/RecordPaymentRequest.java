package com.diagdesk.b2b.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class RecordPaymentRequest {

    @NotNull
    private BigDecimal amount;

    @NotNull
    private LocalDate paymentDate;

    private String paymentMode;

    private String referenceNumber;

    private String notes;
}
