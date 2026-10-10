package com.diagdesk.order.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data @Builder
public class HandoverResponse {
    private String handoverId;
    private String accessionId;
    private String handedOverTo;
    private Instant handedOverAt;
}
