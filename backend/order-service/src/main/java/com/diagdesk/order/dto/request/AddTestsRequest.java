package com.diagdesk.order.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class AddTestsRequest {
    @NotEmpty private List<String> testIds;
    private String reason;
}
