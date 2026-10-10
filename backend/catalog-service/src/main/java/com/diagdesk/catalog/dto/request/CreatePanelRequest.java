package com.diagdesk.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class CreatePanelRequest {
    @NotBlank private String name;
    @NotBlank private String type;
    @NotEmpty private List<String> testIds;
    private String description;
}
