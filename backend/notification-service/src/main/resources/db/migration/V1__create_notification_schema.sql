-- ============================================================
-- Notification Service — PostgreSQL Schema
-- Schema: notifications
-- ============================================================

CREATE SCHEMA IF NOT EXISTS notifications;

CREATE TABLE notifications.notifications (
    notification_id VARCHAR(36)     PRIMARY KEY,
    tenant_id       VARCHAR(36)     NOT NULL,
    recipient_type  VARCHAR(20),
    recipient_id    VARCHAR(36),
    channel         VARCHAR(10)     NOT NULL CHECK (channel IN ('WHATSAPP','SMS','EMAIL')),
    template_id     VARCHAR(36),
    variables       TEXT,
    status          VARCHAR(10)     NOT NULL DEFAULT 'QUEUED'
                        CHECK (status IN ('QUEUED','SENT','DELIVERED','FAILED','BOUNCED')),
    queued_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    failure_reason  VARCHAR(500),
    retry_count     INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_notif_tenant      ON notifications.notifications (tenant_id);
CREATE INDEX idx_notif_recipient   ON notifications.notifications (recipient_id, queued_at DESC);
CREATE INDEX idx_notif_status      ON notifications.notifications (channel, status, queued_at)
    WHERE deleted_at IS NULL;

ALTER TABLE notifications.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notifications.notifications
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE TABLE notifications.notification_templates (
    template_id     VARCHAR(36)     PRIMARY KEY,
    tenant_id       VARCHAR(36),
    name            VARCHAR(200)    NOT NULL,
    channel         VARCHAR(10)     NOT NULL CHECK (channel IN ('WHATSAPP','SMS','EMAIL')),
    subject         VARCHAR(500),
    body            TEXT            NOT NULL,
    variables       VARCHAR(500),
    dlt_template_id VARCHAR(50),
    language_code   VARCHAR(5)      DEFAULT 'en',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_nt_tenant_channel ON notifications.notification_templates (tenant_id, channel)
    WHERE deleted_at IS NULL;

ALTER TABLE notifications.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notifications.notification_templates
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true));
