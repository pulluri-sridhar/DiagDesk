package com.diagdesk.order.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data @Builder
public class OrderResponse {
    private String orderId;
    private String orderNumber;
    private String patientId;
    private String branchId;
    private String b2bPartnerId;
    private String referredByDoctorId;
    private String assignedTo;
    private String priority;
    private String status;
    private String collectionType;
    private String clinicalNotes;
    private String invoiceId;
    private Instant estimatedTat;
    private Instant cancelledAt;
    private String cancellationReason;
    private List<OrderItemResponse> items;
    private List<SampleResponse> samples;
    private Instant createdAt;

    @Data @Builder
    public static class OrderItemResponse {
        private String itemId;
        private String testId;
        private String panelId;
        private String status;
    }
}
