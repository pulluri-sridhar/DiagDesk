package com.diagdesk.notification;

import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.cache.CacheService;
import com.diagdesk.notification.dto.request.SendNotificationRequest;
import com.diagdesk.notification.kafka.NotificationEventProducer;
import com.diagdesk.notification.kafka.ReportReadyConsumer;
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
class NotificationApiIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("diagdesk")
                    .withUsername("diagdesk")
                    .withPassword("diagdesk");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",
                () -> postgres.getJdbcUrl() + "?currentSchema=notifications");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.kafka.bootstrap-servers", () -> "localhost:9999");
    }

    @MockBean AuditPublisher          auditPublisher;
    @MockBean CacheService            cacheService;
    @MockBean NotificationEventProducer notificationEventProducer;
    @MockBean ReportReadyConsumer     reportReadyConsumer;

    @Autowired TestRestTemplate rest;
    @Autowired ObjectMapper     objectMapper;

    private static final String TENANT_ID    = "00000000-0000-0000-0000-000000000001";
    private static final String RECIPIENT_ID = "pat-00000000-0000-0000-0000-000000000001";

    private HttpHeaders tenantHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.set("X-Tenant-Id", TENANT_ID);
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    private SendNotificationRequest validSendRequest() {
        SendNotificationRequest req = new SendNotificationRequest();
        req.setRecipientType("PATIENT");
        req.setRecipientId(RECIPIENT_ID);
        req.setChannel("WHATSAPP");
        req.setTemplateId("REPORT_READY");
        return req;
    }

    private JsonNode sendNotification() throws Exception {
        ResponseEntity<String> res = rest.exchange(
                "/v1/notifications/send", HttpMethod.POST,
                new HttpEntity<>(validSendRequest(), tenantHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readTree(res.getBody());
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    void sendNotification_returns201WithNotificationId() throws Exception {
        JsonNode body = sendNotification();
        assertThat(body.get("notificationId").asText()).isNotBlank();
        assertThat(body.get("channel").asText()).isEqualTo("WHATSAPP");
        assertThat(body.get("status").asText()).isEqualTo("queued");
    }

    @Test
    void getNotification_byId_returns200() throws Exception {
        String notificationId = sendNotification().get("notificationId").asText();

        ResponseEntity<String> res = rest.exchange(
                "/v1/notifications/" + notificationId, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("notificationId").asText()).isEqualTo(notificationId);
    }

    @Test
    void getNotification_unknownId_returns404() {
        ResponseEntity<String> res = rest.exchange(
                "/v1/notifications/00000000-0000-0000-0000-000000000000", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void listNotifications_byRecipient_returnsList() throws Exception {
        sendNotification();

        ResponseEntity<String> res = rest.exchange(
                "/v1/notifications?recipientId=" + RECIPIENT_ID, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.isArray()).isTrue();
        assertThat(body).hasSizeGreaterThan(0);
    }

    @Test
    void retryNotification_returns200() throws Exception {
        String notificationId = sendNotification().get("notificationId").asText();

        ResponseEntity<String> res = rest.exchange(
                "/v1/notifications/" + notificationId + "/retry", HttpMethod.POST,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("notificationId").asText()).isEqualTo(notificationId);
    }

    @Test
    void sendNotification_missingTemplateId_returns400() {
        SendNotificationRequest req = new SendNotificationRequest();
        req.setRecipientType("PATIENT");
        req.setRecipientId(RECIPIENT_ID);
        req.setChannel("SMS");
        // templateId deliberately omitted

        ResponseEntity<String> res = rest.exchange(
                "/v1/notifications/send", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
