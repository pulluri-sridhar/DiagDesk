-- ============================================================
-- B2B Billing Service — PostgreSQL Schema
-- Schema: b2b
-- ============================================================

CREATE SCHEMA IF NOT EXISTS b2b;

CREATE TABLE b2b.b2b_partners (
    partner_id      VARCHAR(36)     PRIMARY KEY,
    tenant_id       VARCHAR(36)     NOT NULL,
    name            VARCHAR(200)    NOT NULL,
    type            VARCHAR(30)     NOT NULL
                        CHECK (type IN ('HOSPITAL','CLINIC','CORPORATE','TPA','REFERENCE_LAB','COLLECTION_FRANCHISE')),
    contact_name    VARCHAR(100),
    contact_phone   VARCHAR(20),
    contact_email   VARCHAR(200),
    address_line1   VARCHAR(300),
    city            VARCHAR(100),
    state           VARCHAR(50),
    pincode         VARCHAR(10),
    gst_number      VARCHAR(20),
    credit_limit    DECIMAL(15,2)   DEFAULT 0,
    billing_cycle   VARCHAR(20)     DEFAULT 'MONTHLY'
                        CHECK (billing_cycle IN ('MONTHLY','FORTNIGHTLY','WEEKLY')),
    credit_days     INTEGER         DEFAULT 30,
    account_number  VARCHAR(50)     UNIQUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_bp_tenant      ON b2b.b2b_partners (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bp_name        ON b2b.b2b_partners (tenant_id, name) WHERE deleted_at IS NULL;

ALTER TABLE b2b.b2b_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON b2b.b2b_partners
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE TABLE b2b.b2b_rate_contracts (
    contract_id     VARCHAR(36)     PRIMARY KEY,
    tenant_id       VARCHAR(36)     NOT NULL,
    partner_id      VARCHAR(36)     NOT NULL REFERENCES b2b.b2b_partners (partner_id),
    name            VARCHAR(200)    NOT NULL,
    effective_from  DATE            NOT NULL,
    effective_to    DATE,
    status          VARCHAR(10)     NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DEACTIVATED')),
    test_rates      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_rc_partner ON b2b.b2b_rate_contracts (partner_id, status) WHERE deleted_at IS NULL;

ALTER TABLE b2b.b2b_rate_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON b2b.b2b_rate_contracts
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE TABLE b2b.b2b_invoices (
    invoice_id          VARCHAR(36)     PRIMARY KEY,
    tenant_id           VARCHAR(36)     NOT NULL,
    partner_id          VARCHAR(36)     NOT NULL REFERENCES b2b.b2b_partners (partner_id),
    invoice_number      VARCHAR(50)     UNIQUE,
    period_from         DATE,
    period_to           DATE,
    subtotal            DECIMAL(15,2)   DEFAULT 0,
    tax_amount          DECIMAL(15,2)   DEFAULT 0,
    total_amount        DECIMAL(15,2)   DEFAULT 0,
    amount_paid         DECIMAL(15,2)   DEFAULT 0,
    amount_outstanding  DECIMAL(15,2)   DEFAULT 0,
    status              VARCHAR(20)     NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','SENT','PARTIALLY_PAID','PAID','OVERDUE')),
    due_date            DATE,
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ,
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_inv_partner ON b2b.b2b_invoices (partner_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_tenant  ON b2b.b2b_invoices (tenant_id, status) WHERE deleted_at IS NULL;

ALTER TABLE b2b.b2b_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON b2b.b2b_invoices
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE TABLE b2b.b2b_payments (
    payment_id          VARCHAR(36)     PRIMARY KEY,
    invoice_id          VARCHAR(36)     NOT NULL REFERENCES b2b.b2b_invoices (invoice_id),
    tenant_id           VARCHAR(36)     NOT NULL,
    amount              DECIMAL(15,2)   NOT NULL,
    payment_date        DATE            NOT NULL,
    payment_mode        VARCHAR(10)     CHECK (payment_mode IN ('NEFT','RTGS','CHEQUE','UPI')),
    reference_number    VARCHAR(100),
    notes               VARCHAR(500),
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    recorded_by         VARCHAR(36)
);

CREATE INDEX idx_pay_invoice ON b2b.b2b_payments (invoice_id);

ALTER TABLE b2b.b2b_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON b2b.b2b_payments
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE TABLE b2b.follow_ups (
    follow_up_id        VARCHAR(36)     PRIMARY KEY,
    tenant_id           VARCHAR(36)     NOT NULL,
    partner_id          VARCHAR(36)     NOT NULL REFERENCES b2b.b2b_partners (partner_id),
    invoice_id          VARCHAR(36),
    action_type         VARCHAR(20)     NOT NULL CHECK (action_type IN ('CALL','EMAIL','VISIT','DEMAND_NOTICE')),
    notes               TEXT,
    next_follow_up_date DATE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          VARCHAR(36)
);

CREATE INDEX idx_fu_partner ON b2b.follow_ups (partner_id, created_at DESC);

ALTER TABLE b2b.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON b2b.follow_ups
    USING (tenant_id = current_setting('app.tenant_id', true));

-- Professional service contracts (FIXED/PER_SERVICE only — per_referral is prohibited)
CREATE TABLE b2b.professional_service_contracts (
    contract_id         VARCHAR(36)     PRIMARY KEY,
    tenant_id           VARCHAR(36)     NOT NULL,
    professional_id     VARCHAR(36)     NOT NULL,
    professional_name   VARCHAR(200)    NOT NULL,
    service_description TEXT,
    fee_type            VARCHAR(20)     NOT NULL CHECK (fee_type IN ('FIXED','PER_SERVICE')),
    amount              DECIMAL(15,2),
    frequency           VARCHAR(20),
    effective_from      DATE,
    effective_to        DATE,
    status              VARCHAR(10)     NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','TERMINATED')),
    compliance_flag     BOOLEAN         NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ,
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_psc_tenant ON b2b.professional_service_contracts (tenant_id, status) WHERE deleted_at IS NULL;

ALTER TABLE b2b.professional_service_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON b2b.professional_service_contracts
    USING (tenant_id = current_setting('app.tenant_id', true));
