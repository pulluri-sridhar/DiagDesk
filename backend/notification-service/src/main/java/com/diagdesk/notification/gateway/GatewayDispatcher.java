package com.diagdesk.notification.gateway;

import com.diagdesk.notification.entity.Notification;
import com.diagdesk.notification.entity.NotificationTemplate;
import com.diagdesk.notification.repository.NotificationRepository;
import com.diagdesk.notification.repository.NotificationTemplateRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Orchestrates notification dispatch:
 *   1. Resolve recipient phone via patient-service
 *   2. Load the notification template from DB (for DLT ID / template name)
 *   3. Call the appropriate MSG91 endpoint (SMS or WhatsApp)
 *   4. Update Notification status → SENT or FAILED
 *
 * All exceptions are caught internally so the caller's transaction always commits.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GatewayDispatcher {

    private final PhoneResolver phoneResolver;
    private final Msg91Gateway msg91Gateway;
    private final NotificationTemplateRepository templateRepository;
    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    private static final Pattern VAR_PATTERN = Pattern.compile("\\{\\{(\\w+)\\}\\}");

    public void dispatch(Notification notification) {
        // 1. Resolve phone
        String phone = phoneResolver.resolve(notification.getRecipientId());
        if (phone == null) {
            fail(notification, "Phone not found for recipientId=" + notification.getRecipientId());
            return;
        }

        // 2. Load template (optional — gateway call can fall back to templateId as flow/template name)
        NotificationTemplate template = templateRepository.findById(notification.getTemplateId()).orElse(null);

        // 3. Parse variables JSON
        Map<String, String> vars = parseVars(notification.getVariables());

        // 4. Dispatch by channel
        try {
            boolean sent;
            switch (notification.getChannel()) {
                case SMS:
                    String flowId = (template != null && template.getDltTemplateId() != null)
                            ? template.getDltTemplateId()
                            : notification.getTemplateId();
                    sent = msg91Gateway.sendSms(phone, flowId, vars);
                    break;

                case WHATSAPP:
                    String templateName = template != null ? template.getName() : notification.getTemplateId();
                    String langCode     = template != null ? template.getLanguageCode() : "en";
                    sent = msg91Gateway.sendWhatsApp(phone, templateName, langCode, vars);
                    break;

                default:
                    log.warn("Channel {} not implemented — skipping notification {}",
                            notification.getChannel(), notification.getNotificationId());
                    return;
            }

            notification.setStatus(sent ? Notification.NotificationStatus.SENT : Notification.NotificationStatus.FAILED);
            notification.setSentAt(OffsetDateTime.now());

        } catch (Exception e) {
            String reason = e.getMessage();
            fail(notification, reason != null && reason.length() > 500 ? reason.substring(0, 500) : reason);
            return;
        }

        notificationRepository.save(notification);
        log.info("Notification {} dispatched channel={} recipientId={}",
                notification.getNotificationId(), notification.getChannel(), notification.getRecipientId());
    }

    private void fail(Notification notification, String reason) {
        notification.setStatus(Notification.NotificationStatus.FAILED);
        notification.setFailureReason(reason);
        notificationRepository.save(notification);
        log.warn("Notification {} failed: {}", notification.getNotificationId(), reason);
    }

    private Map<String, String> parseVars(String variablesJson) {
        if (variablesJson == null || variablesJson.isBlank()) return new HashMap<>();
        try {
            return objectMapper.readValue(variablesJson, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            log.warn("Could not parse notification variables: {}", e.getMessage());
            return new HashMap<>();
        }
    }

    /** Renders a template body by replacing {{var_name}} placeholders with values from vars. */
    public static String renderBody(String body, Map<String, String> vars) {
        if (body == null || vars == null || vars.isEmpty()) return body;
        StringBuffer sb = new StringBuffer();
        Matcher m = VAR_PATTERN.matcher(body);
        while (m.find()) {
            m.appendReplacement(sb, vars.getOrDefault(m.group(1), ""));
        }
        m.appendTail(sb);
        return sb.toString();
    }
}
