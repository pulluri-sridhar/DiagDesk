-- Default global notification templates (tenant_id IS NULL → applies to all tenants).
-- template_id matches the constant used in ReportReadyConsumer.
-- DLT template IDs must be filled in once registered on India's TRAI DLT portal.

INSERT INTO notifications.notification_templates
    (template_id, tenant_id, name, channel, body, variables, dlt_template_id, language_code, created_at)
VALUES
    (
        'report-ready-default',
        NULL,
        'report_ready_whatsapp',
        'WHATSAPP',
        'Your lab report is ready. Report ID: {{report_id}}. Please collect it from the diagnostic center or download it from the DiagDesk app.',
        'report_id',
        NULL,   -- fill once WhatsApp template is approved in MSG91 / Meta
        'en',
        NOW()
    ),
    (
        'report-ready-sms',
        NULL,
        'report_ready_sms',
        'SMS',
        'Your lab report (ID: {{report_id}}) from DiagDesk Diagnostics is ready. Collect or download from the app. -DIAGDK',
        'report_id',
        NULL,   -- fill once DLT template is approved on TRAI portal
        'en',
        NOW()
    )
ON CONFLICT (template_id) DO NOTHING;
