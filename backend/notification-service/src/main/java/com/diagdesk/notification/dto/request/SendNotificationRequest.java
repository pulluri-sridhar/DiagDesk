package com.diagdesk.notification.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class SendNotificationRequest {

    @NotBlank
    private String recipientType;

    @NotBlank
    private String recipientId;

    @NotNull
    private String channel;

    @NotBlank
    private String templateId;

    private Map<String, String> variables;
}
