package com.diagdesk.notification.gateway;

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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * MSG91 gateway for India-first SMS (DLT-compliant Flow API) and WhatsApp Business.
 *
 * SMS:       POST https://api.msg91.com/api/v5/flow/
 * WhatsApp:  POST https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/
 *
 * When MSG91 auth-key is not configured, calls are silently skipped (returns false)
 * so the notification record is still persisted for retry.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class Msg91Gateway {

    @Value("${diagdesk.msg91.auth-key:}")
    private String authKey;

    @Value("${diagdesk.msg91.sender-id:DIAGDK}")
    private String senderId;

    // WhatsApp Business number registered with MSG91 (e.g. "917000000001")
    @Value("${diagdesk.msg91.integrated-number:}")
    private String integratedNumber;

    private static final String SMS_URL = "https://api.msg91.com/api/v5/flow/";
    private static final String WA_URL  = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

    private final ObjectMapper objectMapper;

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Sends an SMS via MSG91 Flow API.
     * @param flowId  DLT-registered template / flow ID in MSG91 dashboard
     * @param vars    key-value pairs for template variable substitution (var1, var2, …)
     * @return true if MSG91 accepted the request
     */
    public boolean sendSms(String phone, String flowId, Map<String, String> vars) throws Exception {
        if (authKey.isBlank()) {
            log.warn("MSG91 auth-key not configured — SMS skipped phone={}", phone);
            return false;
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("flow_id", flowId);
        body.put("sender", senderId);
        body.put("short_url", "0");
        body.put("mobiles", normalizePhone(phone));
        if (vars != null) body.putAll(vars);
        return post(SMS_URL, body);
    }

    /**
     * Sends a WhatsApp template message via MSG91.
     * Variables are mapped positionally to the template body component parameters.
     * @return true if MSG91 accepted the request
     */
    public boolean sendWhatsApp(String phone, String templateName, String languageCode,
                                Map<String, String> vars) throws Exception {
        if (authKey.isBlank()) {
            log.warn("MSG91 auth-key not configured — WhatsApp skipped phone={}", phone);
            return false;
        }
        List<Map<String, String>> parameters = new ArrayList<>();
        if (vars != null) {
            vars.values().forEach(v -> parameters.add(Map.of("type", "text", "text", v)));
        }

        Map<String, Object> template = new LinkedHashMap<>();
        template.put("name", templateName);
        template.put("language", Map.of("code", languageCode != null ? languageCode : "en"));
        template.put("components", List.of(Map.of("type", "body", "parameters", parameters)));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("to", normalizePhone(phone));
        payload.put("type", "template");
        payload.put("template", template);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("integrated_number", integratedNumber);
        body.put("content_type", "template");
        body.put("payload", payload);

        return post(WA_URL, body);
    }

    private boolean post(String url, Map<String, Object> bodyMap) throws Exception {
        String bodyJson = objectMapper.writeValueAsString(bodyMap);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("authkey", authKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                .timeout(Duration.ofSeconds(15))
                .build();
        HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
        log.debug("MSG91 [{}] → {} {}", url, response.statusCode(), response.body());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new Exception("MSG91 error [" + response.statusCode() + "]: " + response.body());
        }
        return true;
    }

    /** Normalises a phone number to India format 91XXXXXXXXXX. */
    private String normalizePhone(String phone) {
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("91") && digits.length() == 12) return digits;
        if (digits.length() == 10) return "91" + digits;
        return digits;
    }
}
