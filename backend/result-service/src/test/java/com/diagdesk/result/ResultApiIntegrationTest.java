package com.diagdesk.result;

import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.cache.CacheService;
import com.diagdesk.result.dto.request.SignoffRequest;
import com.diagdesk.result.dto.request.SubmitResultRequest;
import com.diagdesk.result.dto.request.ValidateResultRequest;
import com.diagdesk.result.kafka.ResultRawConsumer;
import com.diagdesk.result.service.CatalogClient;
import com.diagdesk.result.service.OrderServiceClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@SpringBootTest(webEnvironment = RANDOM_PORT,
        properties = "spring.kafka.listener.auto-startup=false")
@ActiveProfiles("local")
@Testcontainers
class ResultApiIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("diagdesk")
                    .withUsername("diagdesk")
                    .withPassword("diagdesk");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",
                () -> postgres.getJdbcUrl() + "?currentSchema=results");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.kafka.bootstrap-servers", () -> "localhost:9999");
        registry.add("diagdesk.catalog-service.url", () -> "http://localhost:9998");
        registry.add("diagdesk.order-service.url",   () -> "http://localhost:9997");
    }

    @MockBean AuditPublisher       auditPublisher;
    @MockBean CacheService         cacheService;
    @MockBean CatalogClient        catalogClient;
    @MockBean OrderServiceClient   orderServiceClient;
    @MockBean ResultRawConsumer    resultRawConsumer;

    @Autowired TestRestTemplate rest;
    @Autowired ObjectMapper     objectMapper;

    private static final String TENANT_ID    = "00000000-0000-0000-0000-000000000001";
    private static final String ACCESSION_ID = "ACC-2026-00001";

    private HttpHeaders tenantHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.set("X-Tenant-Id", TENANT_ID);
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    private SubmitResultRequest validResult() {
        SubmitResultRequest req = new SubmitResultRequest();
        req.setAccessionId(ACCESSION_ID);
        req.setTestId("CBC-001");
        req.setValue("13.5");
        req.setUnit("g/dL");
        req.setSource("MANUAL");
        req.setEnteredBy("lab-tech-001");
        return req;
    }

    private JsonNode submitResult() throws Exception {
        ResponseEntity<String> res = rest.exchange(
                "/v1/results", HttpMethod.POST,
                new HttpEntity<>(validResult(), tenantHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readTree(res.getBody());
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    void submitResult_returns201WithResultId() throws Exception {
        JsonNode body = submitResult();
        assertThat(body.get("resultId").asText()).isNotBlank();
        assertThat(body.get("accessionId").asText()).isEqualTo(ACCESSION_ID);
        assertThat(body.get("value").asText()).isEqualTo("13.5");
    }

    @Test
    void getResult_byId_returns200() throws Exception {
        String resultId = submitResult().get("resultId").asText();

        ResponseEntity<String> res = rest.exchange(
                "/v1/results/" + resultId, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("resultId").asText()).isEqualTo(resultId);
        assertThat(body.get("testId").asText()).isEqualTo("CBC-001");
    }

    @Test
    void getResult_unknownId_returns404() {
        ResponseEntity<String> res = rest.exchange(
                "/v1/results/00000000-0000-0000-0000-000000000000", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void listResults_byAccession_returnsDataEnvelope() throws Exception {
        submitResult();

        ResponseEntity<String> res = rest.exchange(
                "/v1/results?accessionId=" + ACCESSION_ID, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("data").isArray()).isTrue();
        assertThat(body.get("data")).hasSizeGreaterThan(0);
    }

    @Test
    void validateResult_returns200WithUpdatedStatus() throws Exception {
        String resultId = submitResult().get("resultId").asText();

        ValidateResultRequest req = new ValidateResultRequest();
        // no extra fields required for basic validation

        ResponseEntity<String> res = rest.exchange(
                "/v1/results/" + resultId + "/validate", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("validationStatus").asText()).isNotBlank();
    }

    @Test
    void submitResult_missingValue_returns400() {
        SubmitResultRequest req = new SubmitResultRequest();
        req.setAccessionId(ACCESSION_ID);
        req.setTestId("CBC-001");
        // value deliberately omitted
        req.setSource("MANUAL");

        ResponseEntity<String> res = rest.exchange(
                "/v1/results", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void getPendingValidation_returns200WithDataEnvelope() {
        ResponseEntity<String> res = rest.exchange(
                "/v1/results/pending-validation", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).contains("\"data\"");
    }
}
