package com.diagdesk.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class CreateOrderRequest {
    @NotBlank private String patientId;
    @NotBlank private String branchId;
    @NotEmpty private List<OrderItemRequest> tests;
    private String referredByDoctorId;
    private String b2bPartnerId;
    private String priority = "routine";
    private String clinicalNotes;
    private String collectionType = "walk_in";

    @Data
    public static class OrderItemRequest {
        private String testId;
        private String panelId;
    }
}
