package com.diagdesk.order.service;

import com.diagdesk.order.dto.request.*;
import com.diagdesk.order.dto.response.*;

import java.util.List;

public interface SampleService {
    SampleResponse accession(AccessionSampleRequest request);
    SampleResponse getById(String accessionId);
    SampleResponse updateStatus(String accessionId, UpdateSampleStatusRequest request);
    SampleResponse reject(String accessionId, RejectSampleRequest request);
    byte[] getLabel(String accessionId);
    List<WorklistItemResponse> getWorklist(String branchId, String departmentId, String date);
    List<SampleResponse> getHandoverPending();
    HandoverResponse handover(String accessionId, HandoverRequest request);
}
