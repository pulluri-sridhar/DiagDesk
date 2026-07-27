package com.diagdesk.catalog.service;

import com.diagdesk.catalog.dto.request.*;
import com.diagdesk.catalog.dto.response.*;
import com.diagdesk.common.dto.PageResponse;

public interface TestService {
    TestResponse create(CreateTestRequest request);
    TestResponse getById(String testId);
    PageResponse<TestSummaryResponse> search(String q, String departmentId, Boolean isCustom, int page, int size);
    TestResponse update(String testId, CreateTestRequest request);
    void delete(String testId);

    ReferenceRangeResponse addReferenceRange(String testId, CreateReferenceRangeRequest request);
    java.util.List<ReferenceRangeResponse> getReferenceRanges(String testId);
    ReferenceRangeResponse updateReferenceRange(String testId, String rangeId, CreateReferenceRangeRequest request);
    void deleteReferenceRange(String testId, String rangeId);

    PageResponse<NablEntryResponse> browsNablCatalogue(String q, String category, int page, int size);
    ImportFromNablResponse importFromNabl(ImportFromNablRequest request);
}
