package com.diagdesk.audit.service;

import com.diagdesk.audit.dto.request.CreateConsentRequest;
import com.diagdesk.audit.dto.request.RevokeConsentRequest;
import com.diagdesk.audit.dto.response.ConsentResponse;

import java.util.List;

public interface ConsentService {

    ConsentResponse create(CreateConsentRequest req);

    ConsentResponse getById(String consentId);

    List<ConsentResponse> getByPatient(String patientId);

    ConsentResponse revoke(String consentId, RevokeConsentRequest req);
}
