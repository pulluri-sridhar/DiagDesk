package com.diagdesk.order;

import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.cache.CacheService;
import com.diagdesk.common.idempotency.IdempotencyService;
import com.diagdesk.order.dto.request.CancelOrderRequest;
import com.diagdesk.order.dto.request.CreateOrderRequest;
import com.diagdesk.order.dto.request.UpdateOrderStatusRequest;
import com.diagdesk.order.repository.OrderRepository;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@SpringBootTest(webEnvironment = RANDOM_PORT)
@ActiveProfiles("local")
@Testcontainers
class OrderApiIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("diagdesk")
                    .withUsername("diagdesk")
                    .withPassword("diagdesk");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",
                () -> postgres.getJdbcUrl() + "?currentSchema=orders");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    // ── Infrastructure mocks (no Redis or Kafka broker needed) ───────────────

    @MockBean AuditPublisher    auditPublisher;
    @MockBean CacheService      cacheService;
    @MockBean IdempotencyService idempotencyService;

    @Autowired TestRestTemplate rest;
    @Autowired ObjectMapper     objectMapper;
    @Autowired OrderRepository  orderRepository;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static final String TENANT_ID  = "00000000-0000-0000-0000-000000000001";
    private static final String PATIENT_ID = "00000000-0000-0000-0000-000000000099";
    private static final String BRANCH_ID  = "00000000-0000-0000-0000-000000000001";

    private HttpHeaders tenantHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.set("X-Tenant-Id", TENANT_ID);
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    private CreateOrderRequest validCreateRequest() {
        CreateOrderRequest req = new CreateOrderRequest();
        req.setPatientId(PATIENT_ID);
        req.setBranchId(BRANCH_ID);
        CreateOrderRequest.OrderItemRequest item = new CreateOrderRequest.OrderItemRequest();
        item.setTestId("CBC-001");
        req.setTests(List.of(item));
        return req;
    }

    /** Creates an order and returns the response body as a JsonNode. */
    private JsonNode createOrder() throws Exception {
        ResponseEntity<String> res = rest.exchange(
                "/v1/orders", HttpMethod.POST,
                new HttpEntity<>(validCreateRequest(), tenantHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readTree(res.getBody());
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    void createOrder_returns201WithOrderIdAndAccessionNumber() throws Exception {
        JsonNode body = createOrder();

        assertThat(body.get("orderId").asText()).isNotBlank();
        assertThat(body.get("orderNumber").asText()).startsWith("ORD-");
        assertThat(body.get("accessionNumbers").isArray()).isTrue();
        assertThat(body.get("accessionNumbers").get(0).asText()).startsWith("ACC-");
        assertThat(body.get("status").asText()).isEqualTo("pending_collection");
    }

    @Test
    void getOrder_afterCreation_returns200WithCorrectData() throws Exception {
        String orderId = createOrder().get("orderId").asText();

        ResponseEntity<String> res = rest.exchange(
                "/v1/orders/" + orderId, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("orderId").asText()).isEqualTo(orderId);
        assertThat(body.get("patientId").asText()).isEqualTo(PATIENT_ID);
        assertThat(body.get("status").asText()).isEqualTo("pending_collection");
        assertThat(body.get("items").isArray()).isTrue();
        assertThat(body.get("items")).hasSize(1);
    }

    @Test
    void searchOrders_byPatientId_returnsPagedEnvelope() throws Exception {
        createOrder();

        ResponseEntity<String> res = rest.exchange(
                "/v1/orders?patient_id=" + PATIENT_ID, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("data").isArray()).isTrue();
        assertThat(body.get("total").asLong()).isGreaterThan(0);
    }

    @Test
    void searchOrders_byAssignedTo_returnsOnlyAssignedOrders() throws Exception {
        String orderId = createOrder().get("orderId").asText();
        String phlebotomistId = "00000000-0000-0000-0000-000000000011";

        // Assign the order to a phlebotomist directly (no API for assignment yet)
        orderRepository.findById(orderId).ifPresent(o -> {
            o.setAssignedTo(phlebotomistId);
            orderRepository.save(o);
        });

        ResponseEntity<String> res = rest.exchange(
                "/v1/orders?assigned_to=" + phlebotomistId, HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(res.getBody());
        assertThat(body.get("data").isArray()).isTrue();
        assertThat(body.get("data")).allSatisfy(
                o -> assertThat(o.get("assignedTo").asText()).isEqualTo(phlebotomistId));
    }

    @Test
    void updateOrderStatus_toCollected_returns200() throws Exception {
        String orderId = createOrder().get("orderId").asText();

        UpdateOrderStatusRequest req = new UpdateOrderStatusRequest();
        req.setStatus("collected");

        ResponseEntity<String> res = rest.exchange(
                "/v1/orders/" + orderId + "/status", HttpMethod.PATCH,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).contains("\"collected\"");
    }

    @Test
    void updateOrderStatus_invalidTransition_returns422() throws Exception {
        String orderId = createOrder().get("orderId").asText();

        // pending_collection → complete is not a valid transition (skips intermediate states)
        UpdateOrderStatusRequest req = new UpdateOrderStatusRequest();
        req.setStatus("complete");

        ResponseEntity<String> res = rest.exchange(
                "/v1/orders/" + orderId + "/status", HttpMethod.PATCH,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void updateOrderStatus_unknownStatus_returns422() throws Exception {
        String orderId = createOrder().get("orderId").asText();

        UpdateOrderStatusRequest req = new UpdateOrderStatusRequest();
        req.setStatus("sample_collected"); // Supabase status string, not a valid Java enum value

        ResponseEntity<String> res = rest.exchange(
                "/v1/orders/" + orderId + "/status", HttpMethod.PATCH,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void cancelOrder_returns200WithCancelledStatus() throws Exception {
        String orderId = createOrder().get("orderId").asText();

        CancelOrderRequest cancelReq = new CancelOrderRequest();
        cancelReq.setReason("Patient requested cancellation");

        ResponseEntity<String> res = rest.exchange(
                "/v1/orders/" + orderId + "/cancel", HttpMethod.PATCH,
                new HttpEntity<>(cancelReq, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).contains("\"cancelled\"");
    }

    @Test
    void createOrder_missingPatientId_returns400() {
        CreateOrderRequest req = new CreateOrderRequest();
        req.setBranchId(BRANCH_ID);
        CreateOrderRequest.OrderItemRequest item = new CreateOrderRequest.OrderItemRequest();
        item.setTestId("CBC-001");
        req.setTests(List.of(item));
        // patientId deliberately omitted

        ResponseEntity<String> res = rest.exchange(
                "/v1/orders", HttpMethod.POST,
                new HttpEntity<>(req, tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void getOrder_unknownId_returns404() {
        ResponseEntity<String> res = rest.exchange(
                "/v1/orders/00000000-0000-0000-0000-000000000000", HttpMethod.GET,
                new HttpEntity<>(tenantHeaders()), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
