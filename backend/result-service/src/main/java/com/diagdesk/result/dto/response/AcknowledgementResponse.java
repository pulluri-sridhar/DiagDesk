package com.diagdesk.result.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class AcknowledgementResponse {
    private String acknowledgementId;
}
