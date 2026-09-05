package com.diagdesk.result.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderServiceClient {

    private final RestTemplate restTemplate;

    @Value("${diagdesk.order-service.url}")
    private String orderServiceUrl;

    public AccessionDetails getAccessionDetails(String accessionId, String tenantId) {
        try {
            String url = orderServiceUrl + "/v1/samples/" + accessionId;
            return restTemplate.getForObject(url, AccessionDetails.class);
        } catch (Exception e) {
            log.warn("order-service unavailable for accession {}: {}", accessionId, e.getMessage());
            return null;
        }
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AccessionDetails {
        private String accessionId;
        private String orderId;
        private String patientId;
        private String branchId;
        private String tenantId;
        private String specimenType;
    }
}
