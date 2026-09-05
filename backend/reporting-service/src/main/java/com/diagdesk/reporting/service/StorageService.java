package com.diagdesk.reporting.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
@Slf4j
public class StorageService {

    @Value("${diagdesk.supabase.url}")
    private String supabaseUrl;

    @Value("${diagdesk.supabase.service-role-key}")
    private String serviceRoleKey;

    @Value("${diagdesk.supabase.bucket:lab-reports}")
    private String bucket;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Uploads PDF bytes to Supabase Storage under {tenantId}/{reportId}.pdf.
     * Returns the public URL of the stored object.
     */
    public String upload(String tenantId, String reportId, byte[] pdfBytes)
            throws IOException, InterruptedException {
        String objectPath = tenantId + "/" + reportId + ".pdf";
        String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucket + "/" + objectPath;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(uploadUrl))
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("Content-Type", "application/pdf")
                .header("x-upsert", "true")
                .POST(HttpRequest.BodyPublishers.ofByteArray(pdfBytes))
                .timeout(Duration.ofSeconds(30))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 300) {
            throw new IOException("Supabase upload failed [" + response.statusCode() + "]: " + response.body());
        }

        return supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + objectPath;
    }
}
