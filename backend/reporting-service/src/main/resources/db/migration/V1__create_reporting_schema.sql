-- ============================================================
-- Reporting Service — PostgreSQL Schema
-- Schema: reporting
-- ============================================================

CREATE SCHEMA IF NOT EXISTS reporting;

CREATE TABLE reporting.reports (
    report_id           VARCHAR(36)  PRIMARY KEY,
    order_id            VARCHAR(36)  NOT NULL UNIQUE,
    patient_id          VARCHAR(36)  NOT NULL,
    tenant_id           VARCHAR(36)  NOT NULL,
    branch_id           VARCHAR(36)  NOT NULL,
    template_id         VARCHAR(36),
    letterhead_id       VARCHAR(36),
    status              VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','PENDING_SIGNOFF','SIGNED_OFF','DELIVERED','AMENDED')),
    version             INTEGER      NOT NULL DEFAULT 1,
    clinical_notes      TEXT,
    interpretation      TEXT,
    signed_by           VARCHAR(36),
    signed_at           TIMESTAMPTZ,
    pdf_storage_key     VARCHAR(500),
    print_count         INTEGER      NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ,
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_rep_tenant      ON reporting.reports (tenant_id);
CREATE INDEX idx_rep_order       ON reporting.reports (order_id);
CREATE INDEX idx_rep_patient     ON reporting.reports (patient_id, created_at DESC);
CREATE INDEX idx_rep_status      ON reporting.reports (tenant_id, status) WHERE deleted_at IS NULL;

ALTER TABLE reporting.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON reporting.reports
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE TABLE reporting.report_deliveries (
    delivery_id     VARCHAR(36)  PRIMARY KEY,
    report_id       VARCHAR(36)  NOT NULL REFERENCES reporting.reports (report_id),
    channel         VARCHAR(10)  NOT NULL CHECK (channel IN ('WHATSAPP','SMS','EMAIL')),
    status          VARCHAR(10)  NOT NULL DEFAULT 'QUEUED'
                        CHECK (status IN ('QUEUED','SENT','DELIVERED','FAILED')),
    recipient_id    VARCHAR(36),
    recipient_type  VARCHAR(20),
    queued_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    delivered_at    TIMESTAMPTZ,
    failure_reason  VARCHAR(500)
);

CREATE INDEX idx_del_report ON reporting.report_deliveries (report_id);

CREATE TABLE reporting.print_logs (
    print_log_id    VARCHAR(36)  PRIMARY KEY,
    report_id       VARCHAR(36)  NOT NULL REFERENCES reporting.reports (report_id),
    copies          INTEGER      NOT NULL DEFAULT 1,
    printed_by      VARCHAR(36),
    printer_id      VARCHAR(100),
    printed_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_pl_report ON reporting.print_logs (report_id);

CREATE TABLE reporting.report_templates (
    template_id     VARCHAR(36)  PRIMARY KEY,
    tenant_id       VARCHAR(36)  NOT NULL,
    name            VARCHAR(200) NOT NULL,
    department_id   VARCHAR(36),
    letterhead_id   VARCHAR(36),
    template_html   TEXT,
    format          VARCHAR(20)  NOT NULL DEFAULT 'STANDARD'
                        CHECK (format IN ('STANDARD','CUMULATIVE')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_rt_tenant ON reporting.report_templates (tenant_id) WHERE deleted_at IS NULL;
