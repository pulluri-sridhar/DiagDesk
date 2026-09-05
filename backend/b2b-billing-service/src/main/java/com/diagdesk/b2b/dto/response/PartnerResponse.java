package com.diagdesk.b2b.dto.response;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PartnerResponse {
    private String partnerId;
    private String tenantId;
    private String name;
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
    private int creditDays;
    private String accountNumber;
    private BigDecimal creditUtilized;
    private BigDecimal creditAvailable;
}
