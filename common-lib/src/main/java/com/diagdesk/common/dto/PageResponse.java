package com.diagdesk.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

import java.util.List;

/**
 * Standard paginated response envelope.
 * All list endpoints return this shape: { data[], page, size, total }
 */
@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PageResponse<T> {
    List<T> data;
    int page;
    int size;
    long total;
}
