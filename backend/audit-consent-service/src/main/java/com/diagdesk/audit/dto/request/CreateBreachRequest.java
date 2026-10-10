package com.diagdesk.audit.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

@Data
public class CreateBreachRequest {

    @NotBlank
    private String title;

    private String description;

    private Integer affectedPatientsCount;

    private List<String> dataCategories;

    @NotNull
    private OffsetDateTime detectedAt;

    private String initialSeverity;
}
