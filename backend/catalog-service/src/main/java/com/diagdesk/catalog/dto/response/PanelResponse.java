package com.diagdesk.catalog.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data @Builder
public class PanelResponse {
    private String panelId;
    private String name;
    private String type;
    private String description;
    private List<TestSummaryResponse> tests;
    private Instant createdAt;
    private Instant updatedAt;
}
