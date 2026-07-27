package com.diagdesk.result.service;

import com.diagdesk.result.dto.request.*;
import com.diagdesk.result.dto.response.*;

import java.util.List;

public interface ResultService {

    ResultResponse submit(SubmitResultRequest request);

    ResultResponse getById(String resultId);

    List<ResultResponse> listByAccession(String accessionId);

    List<ResultResponse> listByOrder(String orderId);

    AmendResultResponse amend(String resultId, AmendResultRequest request);

    ValidationResponse validate(String resultId, ValidateResultRequest request);

    SignoffResponse signoff(String resultId, SignoffRequest request);

    ResultResponse rejectValidation(String resultId, RejectValidationRequest request);

    DeltaCheckResponse deltaCheck(String resultId);

    RepeatRequestResponse requestRepeat(String resultId, RepeatRequestRequest request);

    List<ResultResponse> getPendingValidation(String branchId, Integer level, int page, int size);

    List<CriticalAlertResponse> getCriticalAlerts();

    AcknowledgementResponse acknowledgeCritical(String resultId, AcknowledgeCriticalRequest request);

    List<AuditEventResponse> getAuditTrail(String resultId);
}
