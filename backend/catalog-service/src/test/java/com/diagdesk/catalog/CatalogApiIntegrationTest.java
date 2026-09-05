package com.diagdesk.catalog;

import com.diagdesk.catalog.dto.request.CreateTestRequest;
import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.cache.CacheService;
import com.diagdesk.common.idempotency.IdempotencyService;
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

@SpringBootTest(webEnvironment = RANDOM_PORT)
@ActiveProfiles("local")
@Testcontainers
class CatalogApiIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("diagdesk")
                    .withUsername("diagdesk")
                    .withPassword("diagdesk");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",
                () -> postgres.getJdbcUrl() + "?currentSchema=catalog");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @MockBean AuditPublisher    auditPublisher;
    @MockBean CacheService      cacheService;
    @MockBean IdempotencyService idempotencyService;

    @Autowired TestRestTemplate rest;
    @Autowired ObjectMapper     objectMapper;

    private static final String TENANT_ID = "00000000-0000-0000-0000-000000000001";

    private HttpHeaders tenantHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.set("X-Tenant-Id", TENANT_ID);
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    private CreateTestRequest cbc() {
        CreateTestRequest req = new CreateTestRequest();
        req.setCode("CBC");
        req.setName("Complete Blood Count");
        req.setTatHours(4);
        req.setSpecimenType("Whole Blood");
        return req;
    }

    private JsonNode createTest(CreateTestRequest req) throws Exception {
        ResponseEntity<String> res = rest.exchange(
                "/v1/tests", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readTree(res.getBody());
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    void createTest_returns201WithTestId() throws Exception {
        JsonNode body = createTest(cbc());
        assertThat(body.get("test_id").asText()).isNotBlank();
    }

    @Test
    void searchTests_returnsPagedEnvelope() throws Exception {
        createTest(cbc());

        ResponseEntity<String> res = rest.exchange(
                "/v1/tests", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("data").isArray()).isTrue();
        assertThat(body.get("total").asLong()).isGreaterThan(0);
    }

    @Test
    void searchTests_byKeyword_returnsMatchingTest() throws Exception {
        CreateTestRequest lipid = new CreateTestRequest();
        lipid.setCode("LIPID");
        lipid.setName("Lipid Profile");
        lipid.setTatHours(12);
        createTest(lipid);
        createTest(cbc());

        ResponseEntity<String> res = rest.exchange(
                "/v1/tests?q=lipid", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("data").isArray()).isTrue();
        body.get("data").forEach(t ->
                assertThat(t.get("name").asText().toLowerCase()).contains("lipid"));
    }

    @Test
    void getTest_byId_returns200() throws Exception {
        String testId = createTest(cbc()).get("test_id").asText();

        ResponseEntity<String> res = rest.exchange(
                "/v1/tests/" + testId, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("testId").asText()).isEqualTo(testId);
        assertThat(body.get("code").asText()).isEqualTo("CBC");
        assertThat(body.get("name").asText()).isEqualTo("Complete Blood Count");
    }

    @Test
    void getTest_unknownId_returns404() {
        ResponseEntity<String> res = rest.exchange(
                "/v1/tests/00000000-0000-0000-0000-000000000000", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void deleteTest_softDeletes_andNoLongerAppearInSearch() throws Exception {
        String testId = createTest(cbc()).get("test_id").asText();

        ResponseEntity<Void> del = rest.exchange(
                "/v1/tests/" + testId, HttpMethod.DELETE,
                new HttpEntity<>(tenantHeaders()), Void.class);
        assertThat(del.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> get = rest.exchange(
                "/v1/tests/" + testId, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);
        assertThat(get.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void createTest_missingCode_returns400() {
        CreateTestRequest req = new CreateTestRequest();
        req.setName("Unnamed Test");
        // code deliberately omitted

        ResponseEntity<String> res = rest.exchange(
                "/v1/tests", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
