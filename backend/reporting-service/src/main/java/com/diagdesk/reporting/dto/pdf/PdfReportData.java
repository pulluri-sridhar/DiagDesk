package com.diagdesk.reporting.dto.pdf;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PdfReportData {

    private String labName;
    private String labAddress;
    private String labPhone;

    private String patientName;
    private String uhid;
    private String age;
    private String gender;
    private String phone;

    private String reportId;
    private String orderId;
    private String reportedAt;
    private String signedBy;

    private String clinicalNotes;
    private String interpretation;

    private List<TestResultLine> results;

    @Data
    @Builder
    public static class TestResultLine {
        private String testName;
        private String value;
        private String unit;
        private String referenceRange;
        private boolean high;
        private boolean low;
        private boolean critical;
    }
}
