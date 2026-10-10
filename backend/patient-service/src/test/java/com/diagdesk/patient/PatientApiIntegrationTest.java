package com.diagdesk.patient;

import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.cache.CacheService;
import com.diagdesk.common.idempotency.IdempotencyService;
import com.diagdesk.patient.dto.request.RegisterPatientRequest;
import com.diagdesk.patient.service.UhidGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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

import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

/**
 * Integration tests for the Patient API.
 *
 * Uses a real PostgreSQL Testcontainer so Flyway migrations run, constraints are
 * enforced, and repository logic is exercised end-to-end. Redis and Kafka are
 * replaced with Mockito mocks to keep tests self-contained.
 */
@SpringBootTest(webEnvironment = RANDOM_PORT)
@ActiveProfiles("local")
@Testcontainers
class PatientApiIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("diagdesk")
                    .withUsername("diagdesk")
                    .withPassword("diagdesk");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // Flyway uses spring.datasource.url; appending currentSchema=patient
        // sets search_path so Hibernate finds entities without a schema prefix.
        registry.add("spring.datasource.url",
                () -> postgres.getJdbcUrl() + "?currentSchema=patient");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    // ── Infrastructure mocks (no Redis or Kafka broker needed) ───────────────

    @MockBean AuditPublisher   auditPublisher;
    @MockBean CacheService     cacheService;
    @MockBean IdempotencyService idempotencyService;
    @MockBean UhidGenerator    uhidGenerator;

    @Autowired TestRestTemplate rest;
    @Autowired ObjectMapper     objectMapper;

    // Static counter ensures every test gets a unique UHID (uhid has UNIQUE constraint).
    static final AtomicInteger uhidSeq = new AtomicInteger(1);

    @BeforeEach
    void setUp() {
        when(uhidGenerator.next(any()))
                .thenAnswer(inv -> String.format("LAB-2026-%05d", uhidSeq.getAndIncrement()));
        when(cacheService.get(any(), any(Class.class))).thenReturn(Optional.empty());
        when(idempotencyService.check(any())).thenReturn(Optional.empty());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private HttpHeaders tenantHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.set("X-Tenant-Id", "00000000-0000-0000-0000-000000000001");
        return h;
    }

    private RegisterPatientRequest validRequest() {
        RegisterPatientRequest req = new RegisterPatientRequest();
        req.setFirstName("Ananya");
        req.setLastName("Sharma");
        req.setDateOfBirth(LocalDate.of(1990, 6, 15));
        req.setGender("female");
        req.setPhone("+919876543210");
        return req;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    void registerPatient_returns201WithPatientIdAndUhid() {
        ResponseEntity<String> res = rest.exchange(
                "/v1/patients", HttpMethod.POST,
                new HttpEntity<>(validRequest(), tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(res.getBody()).contains("patientId").contains("uhid");
    }

    @Test
    void getPatient_afterRegistration_returns200WithCorrectName() throws Exception {
        ResponseEntity<String> create = rest.exchange(
                "/v1/patients", HttpMethod.POST,
                new HttpEntity<>(validRequest(), tenantHeaders()), String.class);
        assertThat(create.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        String patientId = objectMapper.readTree(create.getBody()).get("patientId").asText();

        ResponseEntity<String> get = rest.exchange(
                "/v1/patients/" + patientId, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(get.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(get.getBody()).contains("Ananya").contains("Sharma");
    }

    @Test
    void searchPatients_byName_returnsPagedDataEnvelope() {
        rest.exchange("/v1/patients", HttpMethod.POST,
                new HttpEntity<>(validRequest(), tenantHeaders()), String.class);

        ResponseEntity<String> res = rest.exchange(
                "/v1/patients?q=Ananya", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).contains("\"data\"").contains("\"total\"");
    }

    @Test
    void registerPatient_invalidPhoneFormat_returns400() {
        RegisterPatientRequest req = validRequest();
        req.setPhone("9876543210"); // missing +91 country code

        ResponseEntity<String> res = rest.exchange(
                "/v1/patients", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void registerPatient_blankFirstName_returns400() {
        RegisterPatientRequest req = validRequest();
        req.setFirstName("   ");

        ResponseEntity<String> res = rest.exchange(
                "/v1/patients", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void getPatient_unknownId_returns404() {
        ResponseEntity<String> res = rest.exchange(
                "/v1/patients/00000000-0000-0000-0000-000000000099",
                HttpMethod.GET, new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
