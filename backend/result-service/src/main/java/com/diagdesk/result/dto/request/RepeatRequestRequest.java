package com.diagdesk.result.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RepeatRequestRequest {

    @NotBlank
    private String reason;

    private String priority = "routine"; // routine, urgent, stat
}
