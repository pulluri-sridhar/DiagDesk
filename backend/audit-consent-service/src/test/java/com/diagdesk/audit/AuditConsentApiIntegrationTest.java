package com.diagdesk.audit;

import com.diagdesk.audit.dto.request.CreateConsentRequest;
import com.diagdesk.audit.dto.request.CreateDsrRequest;
import com.diagdesk.audit.kafka.AuditEventConsumer;
import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.cache.CacheService;
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

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@SpringBootTest(webEnvironment = RANDOM_PORT,
        properties = "spring.kafka.listener.auto-startup=false")
@ActiveProfiles("local")
@Testcontainers
class AuditConsentApiIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("diagdesk")
                    .withUsername("diagdesk")
                    .withPassword("diagdesk");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",
                () -> postgres.getJdbcUrl() + "?currentSchema=audit");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.kafka.bootstrap-servers", () -> "localhost:9999");
    }

    @MockBean AuditPublisher    auditPublisher;
    @MockBean CacheService      cacheService;
    @MockBean AuditEventConsumer auditEventConsumer;

    @Autowired TestRestTemplate rest;
    @Autowired ObjectMapper     objectMapper;

    private static final String TENANT_ID  = "00000000-0000-0000-0000-000000000001";
    private static final String PATIENT_ID = "pat-00000000-0000-0000-0000-000000000001";

    private HttpHeaders tenantHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.set("X-Tenant-Id", TENANT_ID);
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    private CreateConsentRequest validConsentRequest() {
        CreateConsentRequest req = new CreateConsentRequest();
        req.setPatientId(PATIENT_ID);
        req.setConsentType("DATA_PROCESSING");
        req.setPurpose("Laboratory test result processing");
        req.setCapturedVia("WEB_PORTAL");
        req.setCapturedAt(OffsetDateTime.now());
        return req;
    }

    private CreateDsrRequest validDsrRequest() {
        CreateDsrRequest req = new CreateDsrRequest();
        req.setPatientId(PATIENT_ID);
        req.setRequestType("ACCESS");
        req.setContactPhone("+919876543210");
        return req;
    }

    private JsonNode createConsent() throws Exception {
        ResponseEntity<String> res = rest.exchange(
                "/v1/consents", HttpMethod.POST,
                new HttpEntity<>(validConsentRequest(), tenantHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readTree(res.getBody());
    }

    private JsonNode createDsr() throws Exception {
        ResponseEntity<String> res = rest.exchange(
                "/v1/data-subject-requests", HttpMethod.POST,
                new HttpEntity<>(validDsrRequest(), tenantHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readTree(res.getBody());
    }

    // ── Consent tests ─────────────────────────────────────────────────────────

    @Test
    void createConsent_returns201WithConsentId() throws Exception {
        JsonNode body = createConsent();
        assertThat(body.get("consentId").asText()).isNotBlank();
        assertThat(body.get("patientId").asText()).isEqualTo(PATIENT_ID);
        assertThat(body.get("consentType").asText()).isEqualTo("DATA_PROCESSING");
    }

    @Test
    void getConsent_byId_returns200() throws Exception {
        String consentId = createConsent().get("consentId").asText();

        ResponseEntity<String> res = rest.exchange(
                "/v1/consents/" + consentId, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("consentId").asText()).isEqualTo(consentId);
    }

    @Test
    void getConsents_byPatient_returnsList() throws Exception {
        createConsent();

        ResponseEntity<String> res = rest.exchange(
                "/v1/consents/patient/" + PATIENT_ID, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.isArray()).isTrue();
        assertThat(body).hasSizeGreaterThan(0);
    }

    @Test
    void createConsent_missingPatientId_returns400() {
        CreateConsentRequest req = new CreateConsentRequest();
        req.setConsentType("DATA_PROCESSING");
        req.setCapturedVia("WEB_PORTAL");
        // patientId deliberately omitted

        ResponseEntity<String> res = rest.exchange(
                "/v1/consents", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ── DSR tests (DPDP Act 2023) ─────────────────────────────────────────────

    @Test
    void createDsr_returns201WithDsrId() throws Exception {
        JsonNode body = createDsr();
        assertThat(body.get("dsrId").asText()).isNotBlank();
        assertThat(body.get("patientId").asText()).isEqualTo(PATIENT_ID);
        assertThat(body.get("status").asText()).isEqualTo("RECEIVED");
    }

    @Test
    void createDsr_estimatedCompletion_isWithin7Days() throws Exception {
        JsonNode body = createDsr();
        OffsetDateTime estimated = OffsetDateTime.parse(body.get("estimatedCompletion").asText());
        OffsetDateTime received  = OffsetDateTime.parse(body.get("receivedAt").asText());
        long daysBetween = java.time.Duration.between(received, estimated).toDays();
        // DPDP Act 2023: DSR must be fulfilled within 7 days
        assertThat(daysBetween).isEqualTo(7L);
    }

    @Test
    void getDsr_byId_returns200() throws Exception {
        String dsrId = createDsr().get("dsrId").asText();

        ResponseEntity<String> res = rest.exchange(
                "/v1/data-subject-requests/" + dsrId, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("dsrId").asText()).isEqualTo(dsrId);
    }

    @Test
    void listDsrs_returns200WithList() throws Exception {
        createDsr();

        ResponseEntity<String> res = rest.exchange(
                "/v1/data-subject-requests", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.isArray()).isTrue();
        assertThat(body).hasSizeGreaterThan(0);
    }
}
