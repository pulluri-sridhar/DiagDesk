package com.diagdesk.b2b.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreatePartnerRequest {

    @NotBlank
    private String name;

    @NotNull
    private String type;

    private String contactName;
    private String contactPhone;
    private String contactEmail;
    private String addressLine1;
    private String city;
    private String state;
    private String pincode;
    private String gstNumber;
    private BigDecimal creditLimit;
    private String billingCycle;
    private Integer creditDays;
}
