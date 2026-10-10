package com.diagdesk.result.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class SignoffResponse {
    private String signoffId;
    private LocalDateTime signedAt;
    private String signedBy;
    private String newStatus;
}
