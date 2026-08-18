package com.diagdesk.notification.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateTemplateRequest {

    @NotBlank
    private String name;

    @NotNull
    private String channel;

    private String subject;

    @NotBlank
    private String body;

    private String variables;

    private String dltTemplateId;

    private String languageCode = "en";
}
