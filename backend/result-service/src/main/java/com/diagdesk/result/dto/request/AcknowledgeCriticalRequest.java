package com.diagdesk.result.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AcknowledgeCriticalRequest {

    private LocalDateTime calledAt;

    @NotBlank
    private String calledToPhone;

    @NotBlank
    private String callerId;

    private String responseNotes;
}
