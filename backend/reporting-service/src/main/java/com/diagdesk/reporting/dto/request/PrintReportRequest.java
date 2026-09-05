package com.diagdesk.reporting.dto.request;

import lombok.Data;

@Data
public class PrintReportRequest {
    private int copies = 1;
    private String printedBy;
    private String printerId;
}
