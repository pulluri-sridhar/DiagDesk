package com.diagdesk.reporting.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class DeliverReportRequest {
    @NotEmpty private List<String> channels;
    private String recipientType = "patient";
    private String recipientId;
    private int secureLinkExpiryHours = 48;
}
