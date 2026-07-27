package com.diagdesk.catalog.service;

import com.diagdesk.catalog.dto.request.CreateRateCardRequest;
import com.diagdesk.catalog.dto.request.ResolveRateRequest;
import com.diagdesk.catalog.dto.response.RateCardResponse;
import com.diagdesk.catalog.dto.response.RateCardSummaryResponse;
import com.diagdesk.catalog.dto.response.ResolvedRateResponse;

import java.time.LocalDate;
import java.util.List;

public interface RateCardService {
    RateCardResponse create(CreateRateCardRequest request);
    RateCardResponse getById(String rateCardId);
    List<RateCardSummaryResponse> list(String type, String branchId, String partnerId, LocalDate activeOn);
    RateCardResponse update(String rateCardId, CreateRateCardRequest request);
    void delete(String rateCardId);
    ResolvedRateResponse resolve(ResolveRateRequest request);
}
