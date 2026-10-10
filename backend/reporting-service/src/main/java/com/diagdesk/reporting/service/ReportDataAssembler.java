package com.diagdesk.reporting.service;

import com.diagdesk.reporting.dto.pdf.PdfReportData;
import com.diagdesk.reporting.entity.Report;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReportDataAssembler {

    @Value("${diagdesk.patient-service.url}")
    private String patientServiceUrl;

    @Value("${diagdesk.result-service.url}")
    private String resultServiceUrl;

    @Value("${diagdesk.catalog-service.url}")
    private String catalogServiceUrl;

    @Value("${diagdesk.lab.name:DiagDesk Diagnostics}")
    private String labName;

    @Value("${diagdesk.lab.address:}")
    private String labAddress;

    @Value("${diagdesk.lab.phone:}")
    private String labPhone;

    private final HttpServletRequest servletRequest;
    private final ObjectMapper objectMapper;

    // Cache test names — catalog data changes rarely, and we generate many PDFs per test
    private final Map<String, String> testNameCache = new ConcurrentHashMap<>();

    private static final DateTimeFormatter REPORT_DATE_FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm");

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public PdfReportData assemble(Report report) {
        String bearerToken = servletRequest.getHeader("Authorization");

        String patientName = "Unknown Patient";
        String uhid = "-";
        String age = "-";
        String gender = "-";
        String phone = "-";

        try {
            JsonNode patient = getJson(patientServiceUrl + "/v1/patients/" + report.getPatientId(), bearerToken);
            String first = safeText(patient, "firstName");
            String last  = safeText(patient, "lastName");
            patientName = (first + " " + last).trim();
            uhid   = safeText(patient, "uhid");
            gender = safeText(patient, "gender");
            phone  = safeText(patient, "phone");

            String dob = safeText(patient, "dateOfBirth");
            if (!dob.isEmpty()) {
                long years = ChronoUnit.YEARS.between(LocalDate.parse(dob), LocalDate.now());
                age = years + " yrs";
            }
        } catch (Exception e) {
            log.warn("Could not fetch patient patientId={}: {}", report.getPatientId(), e.getMessage());
        }

        List<PdfReportData.TestResultLine> resultLines = new ArrayList<>();
        try {
            JsonNode wrapper = getJson(resultServiceUrl + "/v1/results?orderId=" + report.getOrderId(), bearerToken);
            JsonNode data = wrapper.path("data");
            if (data.isArray()) {
                for (JsonNode r : data) {
                    String testId = safeText(r, "testId");
                    String testName = resolveTestName(testId, bearerToken);

                    // flags is a JSON array of strings, e.g. ["H"] or ["CRITICAL_HIGH"]
                    List<String> flagList = new ArrayList<>();
                    JsonNode flagsNode = r.path("flags");
                    if (flagsNode.isArray()) {
                        flagsNode.forEach(f -> flagList.add(f.asText()));
                    }

                    boolean critical = flagList.stream().anyMatch(f -> f.startsWith("CRITICAL"));
                    boolean high = !critical && flagList.stream().anyMatch(f -> f.equals("H") || f.equals("CRITICAL_HIGH"));
                    boolean low  = !critical && flagList.stream().anyMatch(f -> f.equals("L") || f.equals("CRITICAL_LOW"));

                    resultLines.add(PdfReportData.TestResultLine.builder()
                            .testName(testName)
                            .value(safeText(r, "value"))
                            .unit(safeText(r, "unit"))
                            .referenceRange(safeText(r, "referenceRange"))
                            .high(high)
                            .low(low)
                            .critical(critical)
                            .build());
                }
            }
        } catch (Exception e) {
            log.warn("Could not fetch results orderId={}: {}", report.getOrderId(), e.getMessage());
        }

        Instant signedAt = report.getSignedAt() != null ? report.getSignedAt() : Instant.now();
        String reportedAt = REPORT_DATE_FMT.format(signedAt.atZone(ZoneId.of("Asia/Kolkata")));

        return PdfReportData.builder()
                .labName(labName)
                .labAddress(labAddress)
                .labPhone(labPhone)
                .patientName(patientName)
                .uhid(uhid)
                .age(age)
                .gender(gender)
                .phone(phone)
                .reportId(report.getReportId())
                .orderId(report.getOrderId())
                .reportedAt(reportedAt)
                .signedBy(report.getSignedBy() != null ? report.getSignedBy() : "-")
                .clinicalNotes(report.getClinicalNotes())
                .interpretation(report.getInterpretation())
                .results(resultLines)
                .build();
    }

    private String resolveTestName(String testId, String bearerToken) {
        return testNameCache.computeIfAbsent(testId, id -> {
            try {
                JsonNode test = getJson(catalogServiceUrl + "/v1/tests/" + id, bearerToken);
                String name = safeText(test, "name");
                return name.isEmpty() ? id : name;
            } catch (Exception e) {
                log.warn("Could not resolve test name testId={}", id);
                return id;
            }
        });
    }

    private JsonNode getJson(String url, String bearerToken) throws IOException, InterruptedException {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .timeout(Duration.ofSeconds(10));
        if (bearerToken != null && !bearerToken.isBlank()) {
            builder.header("Authorization", bearerToken);
        }
        HttpResponse<String> response = HTTP.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 300) {
            throw new IOException("HTTP " + response.statusCode() + " from " + url + ": " + response.body());
        }
        return objectMapper.readTree(response.body());
    }

    private String safeText(JsonNode node, String field) {
        JsonNode n = node.path(field);
        return (n.isMissingNode() || n.isNull()) ? "" : n.asText();
    }
}
