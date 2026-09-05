package com.diagdesk.catalog.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data @Builder
public class LetterheadResponse {
    private String letterheadId;
    private String branchId;
    private String logoUrl;
    private String headerHtml;
    private String footerHtml;
    private Integer marginTopMm;
    private Integer marginBottomMm;
    private Instant createdAt;
}
