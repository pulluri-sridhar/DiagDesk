package com.diagdesk.order.service;

import com.diagdesk.common.audit.AuditPublisher;
import com.diagdesk.common.dto.PageResponse;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import com.diagdesk.order.dto.request.*;
import com.diagdesk.order.dto.response.*;
import com.diagdesk.order.entity.*;
import com.diagdesk.order.entity.Order.*;
import com.diagdesk.order.repository.*;
import com.diagdesk.order.statemachine.OrderStateMachine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderServiceImpl implements OrderService {

    private static final int DEFAULT_TAT_HOURS = 24;

    private final OrderRepository orderRepository;
    private final SampleRepository sampleRepository;
    private final AccessionNumberGenerator accessionGen;
    private final OrderNumberGenerator orderNumberGen;
    private final OrderStateMachine stateMachine;
    private final AuditPublisher auditPublisher;

    @Override
    @Transactional
    public CreateOrderResponse create(CreateOrderRequest req) {
        String tenantId = requireTenant();

        Order order = new Order();
        order.setOrderId(UUIDv7.generateAsString());
        order.setOrderNumber(orderNumberGen.next());
        order.setTenantId(tenantId);
        order.setPatientId(req.getPatientId());
        order.setBranchId(req.getBranchId());
        order.setB2bPartnerId(req.getB2bPartnerId());
        order.setReferredByDoctorId(req.getReferredByDoctorId());
        order.setPriority(Priority.valueOf(req.getPriority() != null ? req.getPriority() : "routine"));
        order.setCollectionType(CollectionType.valueOf(
                req.getCollectionType() != null ? req.getCollectionType() : "walk_in"));
        order.setClinicalNotes(req.getClinicalNotes());
        order.setEstimatedTat(Instant.now().plus(Duration.ofHours(DEFAULT_TAT_HOURS)));
        order.setInvoiceId(UUIDv7.generateAsString()); // placeholder — billing service creates real invoice

        // Build order items
        req.getTests().forEach(i -> {
            OrderItem item = new OrderItem();
            item.setItemId(UUIDv7.generateAsString());
            item.setOrder(order);
            item.setTestId(i.getTestId());
            item.setPanelId(i.getPanelId());
            order.getItems().add(item);
        });

        orderRepository.save(order);

        // Auto-accession a sample on order creation (walk-in / counter collection)
        List<String> accessionNumbers = new ArrayList<>();
        if (order.getCollectionType() == CollectionType.walk_in) {
            String accNum = accessionGen.nextAccessionNumber();
            Sample sample = buildSample(order, tenantId, accNum, req);
            sampleRepository.save(sample);
            accessionNumbers.add(accNum);
        }

        log.info("Order created orderId={} orderNumber={}", order.getOrderId(), order.getOrderNumber());
        auditPublisher.publish("order", order.getOrderId(), "order.created", Map.of(
                "patientId", req.getPatientId(), "branchId", req.getBranchId(),
                "itemCount", req.getTests().size()));

        return CreateOrderResponse.builder()
                .orderId(order.getOrderId())
                .orderNumber(order.getOrderNumber())
                .accessionNumbers(accessionNumbers)
                .invoiceId(order.getInvoiceId())
                .estimatedTat(order.getEstimatedTat())
                .status(order.getStatus().name())
                .build();
    }

    @Override
    public OrderResponse getById(String orderId) {
        return toResponse(findOrder(orderId));
    }

    @Override
    public PageResponse<OrderResponse> search(String patientId, String status, String branchId,
                                              Instant dateFrom, Instant dateTo, String priority,
                                              int page, int size) {
        String tenantId = requireTenant();
        OrderStatus statusEnum = status != null ? OrderStatus.valueOf(status) : null;

        Page<Order> result = orderRepository.search(tenantId, patientId, branchId,
                statusEnum, priority, dateFrom, dateTo, PageRequest.of(page, size));

        return PageResponse.<OrderResponse>builder()
                .data(result.getContent().stream().map(this::toResponse).toList())
                .page(page).size(size).total(result.getTotalElements())
                .build();
    }

    @Override
    @Transactional
    public OrderResponse cancel(String orderId, CancelOrderRequest req) {
        Order order = findOrder(orderId);
        stateMachine.validateTransition(order.getStatus(), OrderStatus.cancelled);

        order.setStatus(OrderStatus.cancelled);
        order.setCancellationReason(req.getReason());
        order.setCancelledBy(req.getCancelledBy());
        order.setCancelledAt(Instant.now());
        orderRepository.save(order);

        auditPublisher.publish("order", orderId, "order.cancelled",
                Map.of("reason", req.getReason()));
        return toResponse(order);
    }

    @Override
    @Transactional
    public List<String> addTests(String orderId, AddTestsRequest req) {
        Order order = findOrder(orderId);
        String tenantId = order.getTenantId();

        req.getTestIds().forEach(testId -> {
            OrderItem item = new OrderItem();
            item.setItemId(UUIDv7.generateAsString());
            item.setOrder(order);
            item.setTestId(testId);
            order.getItems().add(item);
        });

        // Create a new accession for the add-on tests
        String accNum = accessionGen.nextAccessionNumber();
        Sample sample = buildSample(order, tenantId, accNum, null);
        sampleRepository.save(sample);
        orderRepository.save(order);

        log.info("Add-on tests added to orderId={} new accession={}", orderId, accNum);
        auditPublisher.publish("order", orderId, "order.tests_added",
                Map.of("addedCount", req.getTestIds().size(), "reason", req.getReason() != null ? req.getReason() : ""));

        return List.of(accNum);
    }

    @Override
    public List<TatBreachResponse> getTatBreaches(String branchId, String departmentId) {
        String tenantId = requireTenant();
        Instant now = Instant.now();
        return orderRepository.findTatBreaches(tenantId, branchId, now)
                .stream().map(o -> TatBreachResponse.builder()
                        .orderId(o.getOrderId()).orderNumber(o.getOrderNumber())
                        .patientId(o.getPatientId()).priority(o.getPriority().name())
                        .status(o.getStatus().name()).estimatedTat(o.getEstimatedTat())
                        .breachMinutes(Duration.between(o.getEstimatedTat(), now).toMinutes())
                        .build())
                .toList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Order findOrder(String orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND, "orderId=" + orderId));
    }

    private String requireTenant() {
        String t = TenantContext.getTenantId();
        if (t == null || t.isBlank()) throw new DiagDeskException(ErrorCode.TENANT_REQUIRED);
        return t;
    }

    private Sample buildSample(Order order, String tenantId, String accNum, CreateOrderRequest req) {
        Sample s = new Sample();
        s.setAccessionId(UUIDv7.generateAsString());
        s.setAccessionNumber(accNum);
        s.setBarcode(accessionGen.toBarcode(accNum));
        s.setOrder(order);
        s.setPatientId(order.getPatientId());
        s.setTenantId(tenantId);
        s.setCollectedAt(Instant.now());
        s.setTatDeadline(order.getEstimatedTat());
        if (req != null) {
            s.setCollectionLocation(toCollectionLocation(req.getCollectionType()));
        }
        return s;
    }

    // Order.CollectionType and Sample.CollectionLocation use different names for the same concept.
    private static Sample.CollectionLocation toCollectionLocation(String collectionType) {
        if (collectionType == null) return Sample.CollectionLocation.counter;
        return switch (collectionType) {
            case "walk_in"         -> Sample.CollectionLocation.counter;
            case "home_collection" -> Sample.CollectionLocation.home;
            case "b2b"             -> Sample.CollectionLocation.b2b_site;
            default                -> Sample.CollectionLocation.counter;
        };
    }

    private OrderResponse toResponse(Order o) {
        List<Sample> samples = sampleRepository.findAllByOrderOrderId(o.getOrderId());
        return OrderResponse.builder()
                .orderId(o.getOrderId()).orderNumber(o.getOrderNumber())
                .patientId(o.getPatientId()).branchId(o.getBranchId())
                .b2bPartnerId(o.getB2bPartnerId()).referredByDoctorId(o.getReferredByDoctorId())
                .priority(o.getPriority().name()).status(o.getStatus().name())
                .collectionType(o.getCollectionType().name())
                .clinicalNotes(o.getClinicalNotes()).invoiceId(o.getInvoiceId())
                .estimatedTat(o.getEstimatedTat())
                .cancelledAt(o.getCancelledAt()).cancellationReason(o.getCancellationReason())
                .createdAt(o.getCreatedAt())
                .items(o.getItems().stream().map(i -> OrderResponse.OrderItemResponse.builder()
                        .itemId(i.getItemId()).testId(i.getTestId())
                        .panelId(i.getPanelId()).status(i.getStatus().name())
                        .build()).toList())
                .samples(samples.stream().map(s -> SampleResponse.builder()
                        .accessionId(s.getAccessionId()).accessionNumber(s.getAccessionNumber())
                        .barcode(s.getBarcode()).status(s.getStatus().name())
                        .collectedAt(s.getCollectedAt()).tatDeadline(s.getTatDeadline())
                        .tatBreached(s.isTatBreached())
                        .labelUrl("/v1/samples/" + s.getAccessionId() + "/label")
                        .build()).toList())
                .build();
    }
}
