package com.diagdesk.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

/** Per-field validation error detail inside an ErrorResponse. */
@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorDetail {
    String field;
    String message;
}
