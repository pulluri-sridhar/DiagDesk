package com.diagdesk.catalog.service;

import com.diagdesk.catalog.dto.request.CreatePanelRequest;
import com.diagdesk.catalog.dto.response.PanelResponse;
import com.diagdesk.catalog.dto.response.PanelSummaryResponse;
import com.diagdesk.common.dto.PageResponse;

public interface PanelService {
    PanelResponse create(CreatePanelRequest request);
    PanelResponse getById(String panelId);
    PageResponse<PanelSummaryResponse> search(String q, String type, int page, int size);
    PanelResponse update(String panelId, CreatePanelRequest request);
    void delete(String panelId);
}
