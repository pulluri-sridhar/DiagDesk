package com.diagdesk.patient.service;

import com.diagdesk.common.dto.PageResponse;
import com.diagdesk.patient.dto.request.ConsentRequest;
import com.diagdesk.patient.dto.request.DedupCheckRequest;
import com.diagdesk.patient.dto.request.RegisterPatientRequest;
import com.diagdesk.patient.dto.response.*;

import java.util.List;

/**
 * Port (in hexagonal architecture terms) — the primary use-case boundary for
 * the Patient bounded context.
 *
 * Controllers and internal callers depend only on this interface.
 * The implementation (PatientServiceImpl) is the only adapter that crosses
 * the domain → infrastructure boundary.
 */
public interface PatientService {

    RegisterPatientResponse register(RegisterPatientRequest request, String idempotencyKey);

    PatientResponse getById(String patientId);

    PageResponse<PatientSummaryResponse> search(String q, String branchId, int page, int size);

    PatientResponse update(String patientId, RegisterPatientRequest request);

    DedupCheckResponse dedupCheck(DedupCheckRequest request);

    ConsentResponse captureConsent(String patientId, ConsentRequest request, String idempotencyKey);

    List<ConsentResponse> getConsents(String patientId);
}
