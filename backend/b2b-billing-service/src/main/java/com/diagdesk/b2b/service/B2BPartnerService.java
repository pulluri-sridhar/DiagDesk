package com.diagdesk.b2b.service;

import com.diagdesk.b2b.dto.request.CreatePartnerRequest;
import com.diagdesk.b2b.dto.response.PartnerResponse;

import java.util.List;

public interface B2BPartnerService {

    PartnerResponse createPartner(CreatePartnerRequest req);

    PartnerResponse getPartner(String partnerId);

    List<PartnerResponse> listPartners(String q, Boolean hasOverdue, int page, int size);

    PartnerResponse updatePartner(String partnerId, CreatePartnerRequest req);

    void deletePartner(String partnerId);
}
