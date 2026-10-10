package com.diagdesk.b2b;

import com.diagdesk.b2b.dto.request.CreatePartnerRequest;
import com.diagdesk.b2b.dto.request.CreateProfessionalContractRequest;
import com.diagdesk.b2b.dto.request.LogFollowUpRequest;
import com.diagdesk.b2b.kafka.B2BEventProducer;
import com.diagdesk.b2b.kafka.OrderCreatedConsumer;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@SpringBootTest(webEnvironment = RANDOM_PORT,
        properties = "spring.kafka.listener.auto-startup=false")
@ActiveProfiles("local")
@Testcontainers
class B2BApiIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("diagdesk")
                    .withUsername("diagdesk")
                    .withPassword("diagdesk");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",
                () -> postgres.getJdbcUrl() + "?currentSchema=b2b");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.kafka.bootstrap-servers", () -> "localhost:9999");
    }

    @MockBean B2BEventProducer    b2bEventProducer;
    @MockBean OrderCreatedConsumer orderCreatedConsumer;
    @MockBean AuditPublisher       auditPublisher;
    @MockBean CacheService         cacheService;

    @Autowired TestRestTemplate rest;
    @Autowired ObjectMapper     objectMapper;

    private static final String TENANT_ID = "00000000-0000-0000-0000-000000000001";

    private HttpHeaders tenantHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.set("X-Tenant-Id", TENANT_ID);
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    private CreatePartnerRequest hospitalPartner() {
        CreatePartnerRequest req = new CreatePartnerRequest();
        req.setName("Apollo Hospital Bangalore");
        req.setType("HOSPITAL");
        req.setContactName("Dr. Ravi Kumar");
        req.setContactPhone("+91 80 2222 3333");
        req.setCity("Bangalore");
        req.setState("Karnataka");
        req.setCreditLimit(BigDecimal.valueOf(500000));
        return req;
    }

    private JsonNode createPartner() throws Exception {
        ResponseEntity<String> res = rest.exchange(
                "/v1/b2b/partners", HttpMethod.POST,
                new HttpEntity<>(hospitalPartner(), tenantHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readTree(res.getBody());
    }

    // ── Partner CRUD ──────────────────────────────────────────────────────────

    @Test
    void createPartner_returns201WithAccountNumber() throws Exception {
        JsonNode body = createPartner();
        assertThat(body.get("partnerId").asText()).isNotBlank();
        assertThat(body.get("accountNumber").asText()).startsWith("B2B-");
        assertThat(body.get("name").asText()).isEqualTo("Apollo Hospital Bangalore");
    }

    @Test
    void getPartner_afterCreation_returns200() throws Exception {
        String partnerId = createPartner().get("partnerId").asText();

        ResponseEntity<String> res = rest.exchange(
                "/v1/b2b/partners/" + partnerId, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("partnerId").asText()).isEqualTo(partnerId);
        assertThat(body.get("creditLimit").decimalValue()).isEqualByComparingTo("500000");
    }

    @Test
    void listPartners_returnsPagedEnvelope() throws Exception {
        createPartner();

        ResponseEntity<String> res = rest.exchange(
                "/v1/b2b/partners", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("data").isArray()).isTrue();
        assertThat(body.get("total").asLong()).isGreaterThan(0);
    }

    @Test
    void getPartner_unknownId_returns404() {
        ResponseEntity<String> res = rest.exchange(
                "/v1/b2b/partners/00000000-0000-0000-0000-000000000000", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void createPartner_missingName_returns400() {
        CreatePartnerRequest req = new CreatePartnerRequest();
        req.setType("HOSPITAL");
        // name deliberately omitted

        ResponseEntity<String> res = rest.exchange(
                "/v1/b2b/partners", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ── Anti-kickback: per_referral must be rejected ───────────────────────────

    @Test
    void createProfessionalContract_perReferral_returns422AntiKickback() {
        CreateProfessionalContractRequest req = new CreateProfessionalContractRequest();
        req.setProfessionalId("00000000-0000-0000-0000-000000000099");
        req.setProfessionalName("Dr. Test Referrer");
        req.setFeeType("per_referral");
        req.setAmount(BigDecimal.valueOf(200));
        req.setEffectiveFrom(LocalDate.now());

        ResponseEntity<String> res = rest.exchange(
                "/v1/b2b/professional-contracts", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(res.getBody()).containsIgnoringCase("anti-kickback");
    }

    @Test
    void createProfessionalContract_fixedFee_returns201() throws Exception {
        CreateProfessionalContractRequest req = new CreateProfessionalContractRequest();
        req.setProfessionalId("00000000-0000-0000-0000-000000000098");
        req.setProfessionalName("Dr. Consultant");
        req.setFeeType("FIXED");
        req.setAmount(BigDecimal.valueOf(5000));
        req.setEffectiveFrom(LocalDate.now());

        ResponseEntity<String> res = rest.exchange(
                "/v1/b2b/professional-contracts", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("contractId").asText()).isNotBlank();
    }

    // ── Receivables: aging report ─────────────────────────────────────────────

    @Test
    void agingReport_returnsStructuredBuckets() throws Exception {
        ResponseEntity<String> res = rest.exchange(
                "/v1/b2b/receivables/aging", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("generatedAt")).isNotNull();
        assertThat(body.get("totalOutstanding")).isNotNull();
        assertThat(body.get("bucketTotals")).isNotNull();
        assertThat(body.get("invoices").has("current")).isTrue();
        assertThat(body.get("invoices").has("overdue_030")).isTrue();
        assertThat(body.get("invoices").has("overdue_90plus")).isTrue();
    }

    // ── Receivables: follow-up logging ────────────────────────────────────────

    @Test
    void logFollowUp_returns200WithFollowUpId() throws Exception {
        String partnerId = createPartner().get("partnerId").asText();

        LogFollowUpRequest req = new LogFollowUpRequest();
        req.setPartnerId(partnerId);
        req.setActionType("CALL");
        req.setNotes("Spoke to billing manager. Payment promised by Friday.");
        req.setNextFollowUpDate(LocalDate.now().plusDays(5));

        ResponseEntity<String> res = rest.exchange(
                "/v1/b2b/receivables/follow-ups", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("followUpId").asText()).isNotBlank();
        assertThat(body.get("actionType").asText()).isEqualTo("CALL");
    }

    @Test
    void listFollowUps_returnsFollowUpsForPartner() throws Exception {
        String partnerId = createPartner().get("partnerId").asText();

        LogFollowUpRequest req = new LogFollowUpRequest();
        req.setPartnerId(partnerId);
        req.setActionType("EMAIL");
        req.setNotes("Sent payment reminder email.");

        rest.exchange("/v1/b2b/receivables/follow-ups", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        ResponseEntity<String> list = rest.exchange(
                "/v1/b2b/receivables/follow-ups?partner_id=" + partnerId, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(list.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(list.getBody());
        assertThat(body.get("data").isArray()).isTrue();
        assertThat(body.get("data")).hasSize(1);
        assertThat(body.get("data").get(0).get("actionType").asText()).isEqualTo("EMAIL");
    }

    // ── Referral analytics disclaimer ─────────────────────────────────────────

    @Test
    void referralAnalytics_alwaysIncludesAntiKickbackDisclaimer() throws Exception {
        ResponseEntity<String> res = rest.exchange(
                "/v1/b2b/referral-analytics", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("disclaimer").asText())
                .containsIgnoringCase("Anti-kickback compliant");
    }
}
