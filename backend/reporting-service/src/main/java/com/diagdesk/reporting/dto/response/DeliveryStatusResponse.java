package com.diagdesk.reporting.dto.response;

import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
public class DeliveryStatusResponse {
    private List<ChannelDelivery> deliveries;

    @Data
    public static class ChannelDelivery {
        private String deliveryId;
        private String channel;
        private String status;
        private Instant deliveredAt;
        private String failureReason;
    }
}
