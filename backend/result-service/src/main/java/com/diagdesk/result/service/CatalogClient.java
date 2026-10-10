package com.diagdesk.result.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class CatalogClient {

    private final RestTemplate restTemplate;

    @Value("${diagdesk.catalog-service.url}")
    private String catalogServiceUrl;

    public TestDetails getTestDetails(String testId, String tenantId) {
        try {
            String url = catalogServiceUrl + "/v1/tests/" + testId;
            return restTemplate.getForObject(url, TestDetails.class);
        } catch (Exception e) {
            log.warn("catalog-service unavailable for test {}: {}", testId, e.getMessage());
            return null;
        }
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TestDetails {
        private String testId;
        private String code;
        private String name;
        private String unit;
        private List<ReferenceRange> referenceRanges;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ReferenceRange {
        private BigDecimal lowerLimit;
        private BigDecimal upperLimit;
        private BigDecimal criticalLow;
        private BigDecimal criticalHigh;
        private String gender;   // all, male, female
        private Integer ageMinYears;
        private Integer ageMaxYears;
    }
}
