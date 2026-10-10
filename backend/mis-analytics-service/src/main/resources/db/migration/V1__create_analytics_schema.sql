-- ============================================================
-- MIS Analytics Service — PostgreSQL Schema
-- Schema: analytics
-- ============================================================

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE analytics.daily_metrics (
    metric_id       VARCHAR(36)     PRIMARY KEY,
    tenant_id       VARCHAR(36)     NOT NULL,
    branch_id       VARCHAR(36),
    metric_date     DATE            NOT NULL,
    metric_type     VARCHAR(50)     NOT NULL,
    dimension_key   VARCHAR(100),
    dimension_value VARCHAR(200),
    numeric_value   DECIMAL(15,2)   DEFAULT 0,
    count_value     BIGINT          DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ
);

CREATE INDEX idx_dm_tenant_date     ON analytics.daily_metrics (tenant_id, metric_date);
CREATE INDEX idx_dm_type_date       ON analytics.daily_metrics (tenant_id, metric_type, metric_date);
CREATE INDEX idx_dm_branch_type     ON analytics.daily_metrics (tenant_id, branch_id, metric_type);

ALTER TABLE analytics.daily_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON analytics.daily_metrics
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE TABLE analytics.alert_records (
    alert_id            VARCHAR(36)     PRIMARY KEY,
    tenant_id           VARCHAR(36)     NOT NULL,
    type                VARCHAR(50)     NOT NULL,
    severity            VARCHAR(10),
    message             TEXT,
    triggered_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    acknowledged        BOOLEAN         NOT NULL DEFAULT false,
    acknowledged_at     TIMESTAMPTZ,
    acknowledged_by     VARCHAR(36)
);

CREATE INDEX idx_ar_tenant_unack ON analytics.alert_records (tenant_id, acknowledged, triggered_at DESC);

ALTER TABLE analytics.alert_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON analytics.alert_records
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE TABLE analytics.digest_subscriptions (
    subscription_id VARCHAR(36)     PRIMARY KEY,
    tenant_id       VARCHAR(36)     NOT NULL,
    user_id         VARCHAR(36)     NOT NULL,
    frequency       VARCHAR(10)     CHECK (frequency IN ('daily','weekly','monthly')),
    channels        VARCHAR(100),
    send_time       VARCHAR(5),
    timezone        VARCHAR(50)     DEFAULT 'Asia/Kolkata',
    active          BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_ds_tenant ON analytics.digest_subscriptions (tenant_id, active);

ALTER TABLE analytics.digest_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON analytics.digest_subscriptions
    USING (tenant_id = current_setting('app.tenant_id', true));
