package com.diagdesk.audit.service;

import com.diagdesk.audit.dto.request.CreateBreachRequest;
import com.diagdesk.audit.dto.request.UpdateBreachRequest;
import com.diagdesk.audit.dto.response.BreachResponse;

import java.util.List;

public interface BreachService {

    BreachResponse create(CreateBreachRequest req);

    BreachResponse getById(String breachId);

    BreachResponse update(String breachId, UpdateBreachRequest req);

    List<BreachResponse> list();
}
