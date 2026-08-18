-- ============================================================
-- Audit & Consent Service — PostgreSQL Schema
-- Schema: audit
-- ============================================================

CREATE SCHEMA IF NOT EXISTS audit;

-- Insert-only audit log; chain hash ensures tamper evidence
CREATE TABLE audit.audit_events (
    event_id        VARCHAR(36)     PRIMARY KEY,
    tenant_id       VARCHAR(36)     NOT NULL,
    entity_type     VARCHAR(30),
    entity_id       VARCHAR(36),
    action          VARCHAR(100),
    actor_id        VARCHAR(36),
    actor_role      VARCHAR(50),
    payload_hash    VARCHAR(64),
    chain_hash      VARCHAR(64),
    branch_id       VARCHAR(36),
    timestamp       TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_ae_tenant_ts      ON audit.audit_events (tenant_id, timestamp DESC);
CREATE INDEX idx_ae_entity         ON audit.audit_events (tenant_id, entity_id, timestamp ASC);
CREATE INDEX idx_ae_entity_type    ON audit.audit_events (tenant_id, entity_type, entity_id);

ALTER TABLE audit.audit_events ENABLE ROW LEVEL SECURITY;
-- Insert-only: no UPDATE or DELETE via RLS
CREATE POLICY tenant_select ON audit.audit_events FOR SELECT
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY tenant_insert ON audit.audit_events FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- DPDP consent records
CREATE TABLE audit.consents (
    consent_id              VARCHAR(36)     PRIMARY KEY,
    tenant_id               VARCHAR(36)     NOT NULL,
    patient_id              VARCHAR(36)     NOT NULL,
    consent_type            VARCHAR(30)     NOT NULL CHECK (consent_type IN ('DATA_PROCESSING','MARKETING','RESEARCH')),
    purpose                 VARCHAR(200),
    language_code           VARCHAR(5)      DEFAULT 'en',
    consent_text_version    VARCHAR(20),
    captured_via            VARCHAR(20),
    ip_address              VARCHAR(45),
    status                  VARCHAR(10)     NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),
    captured_at             TIMESTAMPTZ     NOT NULL DEFAULT now(),
    revoked_at              TIMESTAMPTZ,
    revoked_by              VARCHAR(36),
    hash                    VARCHAR(64)
);

CREATE INDEX idx_consent_patient ON audit.consents (patient_id, captured_at DESC);
CREATE INDEX idx_consent_tenant  ON audit.consents (tenant_id, status);

ALTER TABLE audit.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit.consents
    USING (tenant_id = current_setting('app.tenant_id', true));

-- DPDP data subject requests
CREATE TABLE audit.data_subject_requests (
    dsr_id                  VARCHAR(36)     PRIMARY KEY,
    tenant_id               VARCHAR(36)     NOT NULL,
    patient_id              VARCHAR(36)     NOT NULL,
    request_type            VARCHAR(20)     NOT NULL CHECK (request_type IN ('ACCESS','ERASURE','PORTABILITY','CORRECTION')),
    contact_phone           VARCHAR(20),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'RECEIVED'
                                CHECK (status IN ('RECEIVED','IN_PROGRESS','COMPLETED','OVERDUE')),
    received_at             TIMESTAMPTZ     NOT NULL DEFAULT now(),
    estimated_completion    TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    notes                   TEXT
);

CREATE INDEX idx_dsr_tenant_status ON audit.data_subject_requests (tenant_id, status);
CREATE INDEX idx_dsr_patient       ON audit.data_subject_requests (patient_id);

ALTER TABLE audit.data_subject_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit.data_subject_requests
    USING (tenant_id = current_setting('app.tenant_id', true));

-- CERT-In / DPDP breach notifications
CREATE TABLE audit.breach_notifications (
    breach_id                   VARCHAR(36)     PRIMARY KEY,
    tenant_id                   VARCHAR(36)     NOT NULL,
    title                       VARCHAR(200)    NOT NULL,
    description                 TEXT,
    affected_patients_count     INTEGER,
    data_categories             VARCHAR(500),
    detected_at                 TIMESTAMPTZ,
    severity                    VARCHAR(10),
    status                      VARCHAR(20)     NOT NULL DEFAULT 'OPEN'
                                    CHECK (status IN ('OPEN','CONTAINED','RESOLVED')),
    dpdp_deadline               TIMESTAMPTZ,
    cert_in_deadline            TIMESTAMPTZ,
    notified_authorities_at     TIMESTAMPTZ,
    resolution_notes            TEXT,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_breach_tenant ON audit.breach_notifications (tenant_id, created_at DESC);

ALTER TABLE audit.breach_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit.breach_notifications
    USING (tenant_id = current_setting('app.tenant_id', true));

-- Data retention policies
CREATE TABLE audit.retention_policies (
    policy_id       VARCHAR(36)     PRIMARY KEY,
    tenant_id       VARCHAR(36),
    data_category   VARCHAR(100)    NOT NULL,
    retention_days  INTEGER         NOT NULL,
    action_on_expiry VARCHAR(20)    NOT NULL CHECK (action_on_expiry IN ('ANONYMIZE','DELETE','ARCHIVE')),
    active          BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_rp_tenant ON audit.retention_policies (tenant_id, active);

ALTER TABLE audit.retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit.retention_policies
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true));
