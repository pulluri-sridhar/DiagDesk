package com.diagdesk.audit.dto.request;

import lombok.Data;

@Data
public class RevokeConsentRequest {
    private String reason;
    private String revokedBy;
}
