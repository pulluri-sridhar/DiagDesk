package com.diagdesk.reporting.dto.request;

import lombok.Data;

@Data
public class EditReportRequest {
    private String clinicalNotes;
    private String interpretation;
}
