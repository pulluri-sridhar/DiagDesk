package com.diagdesk.result.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class RepeatRequestResponse {
    private String repeatRequestId;
    private String status;
}
