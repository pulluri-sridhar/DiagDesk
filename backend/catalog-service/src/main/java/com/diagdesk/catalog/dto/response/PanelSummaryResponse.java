package com.diagdesk.catalog.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class PanelSummaryResponse {
    private String panelId;
    private String name;
    private String type;
    private int testCount;
    private String description;
}
