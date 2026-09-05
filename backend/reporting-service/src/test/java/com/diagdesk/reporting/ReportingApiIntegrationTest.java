package com.diagdesk.reporting;

import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.cache.CacheService;
import com.diagdesk.reporting.dto.request.GenerateReportRequest;
import com.diagdesk.reporting.dto.request.SignoffReportRequest;
import com.diagdesk.reporting.kafka.ReportEventProducer;
import com.diagdesk.reporting.kafka.ResultValidatedConsumer;
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
class ReportingApiIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("diagdesk")
                    .withUsername("diagdesk")
                    .withPassword("diagdesk");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",
                () -> postgres.getJdbcUrl() + "?currentSchema=reporting");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.kafka.bootstrap-servers", () -> "localhost:9999");
    }

    @MockBean AuditPublisher         auditPublisher;
    @MockBean CacheService           cacheService;
    @MockBean ReportEventProducer    reportEventProducer;
    @MockBean ResultValidatedConsumer resultValidatedConsumer;

    @Autowired TestRestTemplate rest;
    @Autowired ObjectMapper     objectMapper;

    private static final String TENANT_ID  = "00000000-0000-0000-0000-000000000001";
    private static final String ORDER_ID   = "ord-" + java.util.UUID.randomUUID();
    private static final String PATIENT_ID = "pat-" + java.util.UUID.randomUUID();

    private HttpHeaders tenantHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.set("X-Tenant-Id", TENANT_ID);
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    private GenerateReportRequest validGenerateRequest() {
        GenerateReportRequest req = new GenerateReportRequest();
        req.setOrderId(ORDER_ID);
        req.setPatientId(PATIENT_ID);
        return req;
    }

    private JsonNode generateReport() throws Exception {
        ResponseEntity<String> res = rest.exchange(
                "/v1/reports/generate", HttpMethod.POST,
                new HttpEntity<>(validGenerateRequest(), tenantHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readTree(res.getBody());
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    void generateReport_returns201WithReportId() throws Exception {
        JsonNode body = generateReport();
        assertThat(body.get("reportId").asText()).isNotBlank();
        assertThat(body.get("orderId").asText()).isEqualTo(ORDER_ID);
        assertThat(body.get("status").asText()).isEqualTo("pending_signoff");
    }

    @Test
    void getReport_byId_returns200() throws Exception {
        String reportId = generateReport().get("reportId").asText();

        ResponseEntity<String> res = rest.exchange(
                "/v1/reports/" + reportId, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("reportId").asText()).isEqualTo(reportId);
    }

    @Test
    void getReport_unknownId_returns404() {
        ResponseEntity<String> res = rest.exchange(
                "/v1/reports/00000000-0000-0000-0000-000000000000", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void listReports_byPatient_returnsDataEnvelope() throws Exception {
        generateReport();

        ResponseEntity<String> res = rest.exchange(
                "/v1/reports?patient_id=" + PATIENT_ID, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("data").isArray()).isTrue();
        assertThat(body.get("data")).hasSizeGreaterThan(0);
    }

    @Test
    void signoffReport_returns200WithSignedOffStatus() throws Exception {
        String reportId = generateReport().get("reportId").asText();

        SignoffReportRequest req = new SignoffReportRequest();
        req.setPin("1234");

        ResponseEntity<String> res = rest.exchange(
                "/v1/reports/" + reportId + "/signoff", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("status").asText()).isEqualTo("signed_off");
    }

    @Test
    void deliveryStatus_emptyDeliveries_returns200() throws Exception {
        String reportId = generateReport().get("reportId").asText();

        ResponseEntity<String> res = rest.exchange(
                "/v1/reports/" + reportId + "/delivery-status", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("deliveries").isArray()).isTrue();
    }

    @Test
    void generateReport_missingOrderId_returns400() {
        GenerateReportRequest req = new GenerateReportRequest();
        req.setPatientId(PATIENT_ID);
        // orderId deliberately omitted

        ResponseEntity<String> res = rest.exchange(
                "/v1/reports/generate", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
