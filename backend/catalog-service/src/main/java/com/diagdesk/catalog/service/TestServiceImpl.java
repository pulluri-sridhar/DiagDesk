package com.diagdesk.catalog.service;

import com.diagdesk.catalog.dto.request.*;
import com.diagdesk.catalog.dto.response.*;
import com.diagdesk.catalog.entity.*;
import com.diagdesk.catalog.repository.*;
import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.dto.PageResponse;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TestServiceImpl implements TestService {

    private final TestRepository testRepository;
    private final ReferenceRangeRepository rangeRepository;
    private final NablCatalogueRepository nablRepository;
    private final AuditPublisher auditPublisher;

    // ── Test CRUD ──────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public TestResponse create(CreateTestRequest req) {
        String tenantId = requireTenant();
        if (testRepository.existsByTenantIdAndCode(tenantId, req.getCode())) {
            throw new DiagDeskException(ErrorCode.CONFLICT, "Test code already exists: " + req.getCode());
        }

        Test test = new Test();
        test.setTestId(UUIDv7.generateAsString());
        test.setTenantId(tenantId);
        mapRequest(req, test);
        testRepository.save(test);

        log.info("Test created testId={} code={}", test.getTestId(), test.getCode());
        auditPublisher.publish("test", test.getTestId(), "test.created", req);
        return toResponse(test);
    }

    @Override
    public TestResponse getById(String testId) {
        return toResponse(findTest(testId));
    }

    @Override
    public PageResponse<TestSummaryResponse> search(String q, String departmentId, Boolean isCustom, int page, int size) {
        String tenantId = requireTenant();
        PageRequest pr = PageRequest.of(page, size);
        Page<Test> result = (q != null || departmentId != null || isCustom != null)
                ? testRepository.search(tenantId, q, departmentId, isCustom, pr)
                : testRepository.findAllByTenantId(tenantId, pr);

        return PageResponse.<TestSummaryResponse>builder()
                .data(result.getContent().stream().map(this::toSummary).toList())
                .page(page).size(size).total(result.getTotalElements())
                .build();
    }

    @Override
    @Transactional
    public TestResponse update(String testId, CreateTestRequest req) {
        Test test = findTest(testId);
        mapRequest(req, test);
        testRepository.save(test);
        auditPublisher.publish("test", testId, "test.updated", req);
        return toResponse(test);
    }

    @Override
    @Transactional
    public void delete(String testId) {
        Test test = findTest(testId);
        test.softDelete();
        testRepository.save(test);
        log.info("Test soft-deleted testId={}", testId);
    }

    // ── Reference Ranges ──────────────────────────────────────────────────────

    @Override
    @Transactional
    public ReferenceRangeResponse addReferenceRange(String testId, CreateReferenceRangeRequest req) {
        Test test = findTest(testId);
        TestReferenceRange range = new TestReferenceRange();
        range.setRangeId(UUIDv7.generateAsString());
        range.setTest(test);
        mapRange(req, range);
        rangeRepository.save(range);
        return toRangeResponse(range);
    }

    @Override
    public List<ReferenceRangeResponse> getReferenceRanges(String testId) {
        findTest(testId);
        return rangeRepository.findAllByTestTestId(testId).stream()
                .map(this::toRangeResponse).toList();
    }

    @Override
    @Transactional
    public ReferenceRangeResponse updateReferenceRange(String testId, String rangeId, CreateReferenceRangeRequest req) {
        TestReferenceRange range = rangeRepository.findByRangeIdAndTestTestId(rangeId, testId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND, "rangeId=" + rangeId));
        mapRange(req, range);
        rangeRepository.save(range);
        return toRangeResponse(range);
    }

    @Override
    @Transactional
    public void deleteReferenceRange(String testId, String rangeId) {
        TestReferenceRange range = rangeRepository.findByRangeIdAndTestTestId(rangeId, testId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND, "rangeId=" + rangeId));
        rangeRepository.delete(range);
    }

    // ── NABL Catalogue ────────────────────────────────────────────────────────

    @Override
    public PageResponse<NablEntryResponse> browsNablCatalogue(String q, String category, int page, int size) {
        Page<NablCatalogueEntry> result = nablRepository.search(q, category, PageRequest.of(page, size));
        return PageResponse.<NablEntryResponse>builder()
                .data(result.getContent().stream().map(this::toNablResponse).toList())
                .page(page).size(size).total(result.getTotalElements())
                .build();
    }

    @Override
    @Transactional
    public ImportFromNablResponse importFromNabl(ImportFromNablRequest req) {
        String tenantId = requireTenant();
        List<ImportFromNablResponse.ImportedTest> imported = new ArrayList<>();
        List<String> alreadyExists = new ArrayList<>();
        List<String> notFound = new ArrayList<>();

        Set<String> existingNablCodes = testRepository
                .findAllByTenantIdAndNablCodeIn(tenantId, req.getNablCodes())
                .stream().map(Test::getNablCode).collect(Collectors.toSet());

        for (String nablCode : req.getNablCodes()) {
            if (existingNablCodes.contains(nablCode)) {
                alreadyExists.add(nablCode);
                continue;
            }
            NablCatalogueEntry entry = nablRepository.findById(nablCode).orElse(null);
            if (entry == null) {
                notFound.add(nablCode);
                continue;
            }

            Test test = new Test();
            test.setTestId(UUIDv7.generateAsString());
            test.setTenantId(tenantId);
            test.setCode(nablCode);
            test.setName(entry.getName());
            test.setMethod(entry.getMethod());
            test.setUnit(entry.getUnit());
            test.setSpecimenType(entry.getSpecimenType());
            test.setContainer(entry.getContainer());
            test.setCustom(false);
            test.setNablCode(nablCode);
            testRepository.save(test);

            imported.add(ImportFromNablResponse.ImportedTest.builder()
                    .testId(test.getTestId()).nablCode(nablCode).name(entry.getName())
                    .build());
        }

        log.info("NABL import: imported={} existing={} notFound={}", imported.size(), alreadyExists.size(), notFound.size());
        return ImportFromNablResponse.builder()
                .imported(imported).alreadyExists(alreadyExists).notFound(notFound)
                .build();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Test findTest(String testId) {
        return testRepository.findById(testId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND, "testId=" + testId));
    }

    private String requireTenant() {
        String t = TenantContext.getTenantId();
        if (t == null || t.isBlank()) throw new DiagDeskException(ErrorCode.TENANT_REQUIRED);
        return t;
    }

    private void mapRequest(CreateTestRequest req, Test test) {
        test.setCode(req.getCode());
        test.setName(req.getName());
        test.setMethod(req.getMethod());
        test.setUnit(req.getUnit());
        test.setSpecimenType(req.getSpecimenType());
        test.setContainer(req.getContainer());
        test.setTatHours(req.getTatHours());
        test.setDepartmentId(req.getDepartmentId());
        test.setCustom(req.isCustom());
        test.setNablCode(req.isCustom() ? null : req.getNablCode());
    }

    private void mapRange(CreateReferenceRangeRequest req, TestReferenceRange range) {
        range.setAgeMinYears(req.getAgeMinYears());
        range.setAgeMaxYears(req.getAgeMaxYears());
        range.setGender(TestReferenceRange.Gender.valueOf(req.getGender() != null ? req.getGender() : "all"));
        range.setLowerLimit(req.getLowerLimit());
        range.setUpperLimit(req.getUpperLimit());
        range.setCriticalLow(req.getCriticalLow());
        range.setCriticalHigh(req.getCriticalHigh());
        range.setUnit(req.getUnit());
    }

    private TestResponse toResponse(Test t) {
        return TestResponse.builder()
                .testId(t.getTestId()).code(t.getCode()).name(t.getName())
                .method(t.getMethod()).unit(t.getUnit()).specimenType(t.getSpecimenType())
                .container(t.getContainer()).tatHours(t.getTatHours())
                .departmentId(t.getDepartmentId()).custom(t.isCustom()).nablCode(t.getNablCode())
                .referenceRanges(t.getReferenceRanges().stream().map(this::toRangeResponse).toList())
                .createdAt(t.getCreatedAt()).updatedAt(t.getUpdatedAt())
                .build();
    }

    private TestSummaryResponse toSummary(Test t) {
        return TestSummaryResponse.builder()
                .testId(t.getTestId()).code(t.getCode()).name(t.getName())
                .unit(t.getUnit()).tatHours(t.getTatHours()).custom(t.isCustom())
                .price(t.getDefaultPrice())
                .build();
    }

    private ReferenceRangeResponse toRangeResponse(TestReferenceRange r) {
        return ReferenceRangeResponse.builder()
                .rangeId(r.getRangeId()).ageMinYears(r.getAgeMinYears()).ageMaxYears(r.getAgeMaxYears())
                .gender(r.getGender().name()).lowerLimit(r.getLowerLimit()).upperLimit(r.getUpperLimit())
                .criticalLow(r.getCriticalLow()).criticalHigh(r.getCriticalHigh()).unit(r.getUnit())
                .build();
    }

    private NablEntryResponse toNablResponse(NablCatalogueEntry e) {
        return NablEntryResponse.builder()
                .nablCode(e.getNablCode()).name(e.getName()).method(e.getMethod())
                .specimenType(e.getSpecimenType()).category(e.getCategory()).unit(e.getUnit())
                .defaultReferenceRanges(e.getDefaultReferenceRanges())
                .build();
    }
}
