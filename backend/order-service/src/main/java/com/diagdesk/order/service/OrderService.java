package com.diagdesk.order.service;

import com.diagdesk.order.dto.request.*;
import com.diagdesk.order.dto.response.*;
import com.diagdesk.common.dto.PageResponse;

import java.time.Instant;
import java.util.List;

public interface OrderService {
    CreateOrderResponse create(CreateOrderRequest request);
    OrderResponse getById(String orderId);
    PageResponse<OrderResponse> search(String patientId, String status, String branchId,
                                       Instant dateFrom, Instant dateTo, String priority,
                                       String assignedTo, int page, int size);
    OrderResponse updateStatus(String orderId, UpdateOrderStatusRequest request);
    OrderResponse cancel(String orderId, CancelOrderRequest request);
    List<String> addTests(String orderId, AddTestsRequest request);
    List<TatBreachResponse> getTatBreaches(String branchId, String departmentId);
}
