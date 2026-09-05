package com.diagdesk.audit.service;

import com.diagdesk.audit.dto.request.CreateDsrRequest;
import com.diagdesk.audit.dto.response.DsrResponse;

import java.util.List;

public interface DsrService {

    DsrResponse create(CreateDsrRequest req);

    DsrResponse getById(String dsrId);

    List<DsrResponse> list(String status, String requestType, int page, int size);
}
