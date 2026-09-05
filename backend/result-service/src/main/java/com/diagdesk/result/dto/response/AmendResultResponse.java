package com.diagdesk.result.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class AmendResultResponse {
    private String resultId;
    private Integer version;
    private String value;
    private String previousValue;
    private LocalDateTime amendedAt;
    private String amendedBy;
}
