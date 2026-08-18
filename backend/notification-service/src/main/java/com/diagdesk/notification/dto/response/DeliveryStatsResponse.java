package com.diagdesk.notification.dto.response;

import lombok.Data;

@Data
public class DeliveryStatsResponse {
    private String channel;
    private long sent;
    private long delivered;
    private long failed;
    private long pending;
    private double deliveryRatePct;
}
