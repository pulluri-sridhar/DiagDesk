package com.diagdesk.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.List;

/**
 * Standard error envelope returned by every service.
 * Shape: { "error": { "code", "message", "details"[] }, "timestamp", "traceId" }
 */
@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {

    @Value
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Error {
        String code;
        String message;
        List<ErrorDetail> details;
    }

    Error error;
    Instant timestamp;
    String traceId;
}
