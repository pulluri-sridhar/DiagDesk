package com.diagdesk.analytics;

import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.cache.CacheService;
import com.diagdesk.analytics.kafka.AnalyticsEventConsumer;
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

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@SpringBootTest(webEnvironment = RANDOM_PORT,
        properties = "spring.kafka.listener.auto-startup=false")
@ActiveProfiles("local")
@Testcontainers
class AnalyticsApiIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("diagdesk")
                    .withUsername("diagdesk")
                    .withPassword("diagdesk");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",
                () -> postgres.getJdbcUrl() + "?currentSchema=analytics");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.kafka.bootstrap-servers", () -> "localhost:9999");
    }

    @MockBean AuditPublisher        auditPublisher;
    @MockBean CacheService          cacheService;
    @MockBean AnalyticsEventConsumer analyticsEventConsumer;

    @Autowired TestRestTemplate rest;
    @Autowired ObjectMapper     objectMapper;

    private static final String TENANT_ID = "00000000-0000-0000-0000-000000000001";

    private HttpHeaders tenantHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.set("X-Tenant-Id", TENANT_ID);
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    void getSamples_returns200WithDataMap() {
        ResponseEntity<String> res = rest.exchange(
                "/v1/analytics/samples?period=month", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void getOperations_returns200() {
        ResponseEntity<String> res = rest.exchange(
                "/v1/analytics/operations?period=month", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void getAlerts_returns200WithAlertsKey() throws Exception {
        ResponseEntity<String> res = rest.exchange(
                "/v1/analytics/alerts", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.has("alerts")).isTrue();
        assertThat(body.get("alerts").isArray()).isTrue();
    }

    @Test
    void acknowledgeAlert_unknownId_returns404() {
        ResponseEntity<String> res = rest.exchange(
                "/v1/analytics/alerts/00000000-0000-0000-0000-000000000000/acknowledge",
                HttpMethod.POST,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void createDigest_returns200WithSubscriptionId() throws Exception {
        Map<String, Object> req = Map.of(
                "recipientEmail", "admin@lab.in",
                "frequency", "daily",
                "reportTypes", new String[]{"revenue", "samples"}
        );

        ResponseEntity<String> res = rest.exchange(
                "/v1/analytics/digests", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("subscription_id").asText()).isNotBlank();
    }

    @Test
    void listDigests_returns200WithArray() throws Exception {
        ResponseEntity<String> res = rest.exchange(
                "/v1/analytics/digests", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.isArray()).isTrue();
    }

    @Test
    void deleteDigest_existingId_returns204() throws Exception {
        // create one first
        Map<String, Object> req = Map.of("recipientEmail", "ops@lab.in", "frequency", "weekly");
        ResponseEntity<String> createRes = rest.exchange(
                "/v1/analytics/digests", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);
        String subscriptionId = objectMapper.readTree(createRes.getBody()).get("subscription_id").asText();

        ResponseEntity<Void> res = rest.exchange(
                "/v1/analytics/digests/" + subscriptionId, HttpMethod.DELETE,
                new HttpEntity<>(tenantHeaders()), Void.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }
}
