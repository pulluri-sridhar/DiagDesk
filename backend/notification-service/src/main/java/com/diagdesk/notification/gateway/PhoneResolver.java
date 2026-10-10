package com.diagdesk.notification.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Resolves a patientId to a phone number by calling patient-service.
 * Uses a configured service-account JWT for inter-service auth; gracefully
 * returns null (and logs a warning) if the call fails or is unconfigured.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PhoneResolver {

    @Value("${diagdesk.patient-service.url}")
    private String patientServiceUrl;

    @Value("${diagdesk.internal.service-token:}")
    private String serviceToken;

    private final ObjectMapper objectMapper;

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public String resolve(String patientId) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(patientServiceUrl + "/v1/patients/" + patientId))
                    .GET()
                    .timeout(Duration.ofSeconds(10));
            if (!serviceToken.isBlank()) {
                builder.header("Authorization", "Bearer " + serviceToken);
            }
            HttpResponse<String> resp = HTTP.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                JsonNode node = objectMapper.readTree(resp.body());
                String phone = node.path("phone").asText("");
                if (!phone.isBlank()) return phone;
            }
            log.warn("No phone found for patientId={}: HTTP {}", patientId, resp.statusCode());
        } catch (Exception e) {
            log.warn("Phone resolution failed for patientId={}: {}", patientId, e.getMessage());
        }
        return null;
    }
}
