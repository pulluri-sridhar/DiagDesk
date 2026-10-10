package com.diagdesk.catalog.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class ImportFromNablRequest {
    @NotEmpty private List<String> nablCodes;
}
