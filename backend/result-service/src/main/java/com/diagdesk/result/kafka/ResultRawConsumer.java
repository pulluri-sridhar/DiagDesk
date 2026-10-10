package com.diagdesk.result.kafka;

import com.diagdesk.common.security.TenantContext;
import com.diagdesk.result.dto.request.SubmitResultRequest;
import com.diagdesk.result.service.CatalogClient;
import com.diagdesk.result.service.ResultService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Consumes result.raw events published by device-gateway when an analyzer result
 * is auto-matched to an accession. Translates the event into a ResultService.submit() call.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ResultRawConsumer {

    private final ResultService resultService;
    private final CatalogClient catalogClient;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "result.raw", groupId = "result-service",
                   containerFactory = "kafkaListenerContainerFactory")
    public void consume(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);

            String tenantId    = payload.path("tenant_id").asText();
            String branchId    = payload.path("branch_id").asText();
            String accessionId = payload.path("accession_id").asText();
            String testCode    = payload.path("test_code").asText();
            String value       = payload.path("value").asText();
            String unit        = payload.path("unit").asText();
            String analyzerId  = payload.path("analyzer_id").asText();

            // Populate TenantContext for this thread so service-layer checks pass
            TenantContext.setTenantId(tenantId);
            TenantContext.setBranchId(branchId);
            TenantContext.setUserId("system");

            // Resolve testId from test_code via catalog-service
            // Falls back to test_code itself when catalog is unavailable (stored as-is)
            String testId = resolveTestId(testCode, tenantId);

            SubmitResultRequest req = new SubmitResultRequest();
            req.setAccessionId(accessionId);
            req.setTestId(testId);
            req.setTestCode(testCode);
            req.setValue(value);
            req.setUnit(unit);
            req.setMethod("Automated Analyzer");
            req.setSource("ANALYZER");
            req.setEnteredBy(analyzerId);

            resultService.submit(req);

            log.info("result.raw consumed: accession={} test={} value={}", accessionId, testCode, value);

        } catch (Exception e) {
            log.error("Failed to process result.raw message: {}", message, e);
            // Don't rethrow — prevents Kafka from retrying a poison message indefinitely.
            // In production, route to a DLQ instead.
        } finally {
            TenantContext.clear();
        }
    }

    private String resolveTestId(String testCode, String tenantId) {
        try {
            // Catalog-service has /v1/tests?code=<testCode> — use test code as ID fallback
            // TODO: add GET /v1/tests?code= endpoint to catalog-service for proper lookup
            CatalogClient.TestDetails details = catalogClient.getTestDetails(testCode, tenantId);
            if (details != null && details.getTestId() != null) {
                return details.getTestId();
            }
        } catch (Exception e) {
            log.warn("Could not resolve test_id for code {}: {}", testCode, e.getMessage());
        }
        return testCode; // use code as fallback — human review will correct
    }
}
