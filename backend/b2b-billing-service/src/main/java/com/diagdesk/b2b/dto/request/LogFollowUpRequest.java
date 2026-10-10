package com.diagdesk.b2b.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class LogFollowUpRequest {

    @NotBlank
    private String partnerId;

    private String invoiceId;

    @NotBlank
    private String actionType;

    private String notes;

    private LocalDate nextFollowUpDate;
}
