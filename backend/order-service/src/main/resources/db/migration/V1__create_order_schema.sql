-- ============================================================
-- Order & Workflow Service — PostgreSQL Schema
-- Schema: orders
-- ============================================================

CREATE SCHEMA IF NOT EXISTS orders;

-- ── Orders ────────────────────────────────────────────────────────────────────

CREATE TABLE orders.orders (
    order_id              VARCHAR(36)  PRIMARY KEY,
    order_number          VARCHAR(20)  NOT NULL UNIQUE,
    tenant_id             VARCHAR(36)  NOT NULL,
    patient_id            VARCHAR(36)  NOT NULL,
    branch_id             VARCHAR(36)  NOT NULL,
    b2b_partner_id        VARCHAR(36),
    referred_by_doctor_id VARCHAR(36),
    priority              VARCHAR(10)  NOT NULL DEFAULT 'routine'
                              CHECK (priority IN ('routine','urgent','stat')),
    status                VARCHAR(25)  NOT NULL DEFAULT 'pending_collection'
                              CHECK (status IN (
                                'pending_collection','collected','in_processing',
                                'partially_complete','complete','cancelled')),
    collection_type       VARCHAR(20)  NOT NULL DEFAULT 'walk_in'
                              CHECK (collection_type IN ('walk_in','home_collection','b2b')),
    clinical_notes        VARCHAR(1000),
    invoice_id            VARCHAR(36),
    estimated_tat         TIMESTAMPTZ,
    cancellation_reason   VARCHAR(500),
    cancelled_by          VARCHAR(36),
    cancelled_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ,
    created_by            VARCHAR(36),
    updated_by            VARCHAR(36),
    deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_order_tenant   ON orders.orders (tenant_id);
CREATE INDEX idx_order_patient  ON orders.orders (patient_id);
CREATE INDEX idx_order_branch   ON orders.orders (branch_id);
CREATE INDEX idx_order_status   ON orders.orders (tenant_id, status);
CREATE INDEX idx_order_tat      ON orders.orders (estimated_tat) WHERE deleted_at IS NULL;

-- ── Order Items ───────────────────────────────────────────────────────────────

CREATE TABLE orders.order_items (
    item_id    VARCHAR(36)  PRIMARY KEY,
    order_id   VARCHAR(36)  NOT NULL REFERENCES orders.orders (order_id) ON DELETE CASCADE,
    test_id    VARCHAR(36),
    panel_id   VARCHAR(36),
    status     VARCHAR(20)  NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','in_process','complete','cancelled')),

    CONSTRAINT chk_test_or_panel CHECK (test_id IS NOT NULL OR panel_id IS NOT NULL)
);

CREATE INDEX idx_oi_order ON orders.order_items (order_id);
CREATE INDEX idx_oi_test  ON orders.order_items (test_id);

-- ── Samples ───────────────────────────────────────────────────────────────────

CREATE TABLE orders.samples (
    accession_id       VARCHAR(36)  PRIMARY KEY,
    accession_number   VARCHAR(20)  NOT NULL UNIQUE,
    barcode            VARCHAR(20)  NOT NULL,
    order_id           VARCHAR(36)  NOT NULL REFERENCES orders.orders (order_id),
    patient_id         VARCHAR(36)  NOT NULL,
    tenant_id          VARCHAR(36)  NOT NULL,
    specimen_type      VARCHAR(100),
    container          VARCHAR(100),
    collected_by       VARCHAR(36),
    collected_at       TIMESTAMPTZ,
    collection_location VARCHAR(20) CHECK (collection_location IN ('counter','home','b2b_site')),
    status             VARCHAR(15)  NOT NULL DEFAULT 'collected'
                           CHECK (status IN (
                             'collected','received','in_process','processed',
                             'reported','rejected','handed_over')),
    received_at        TIMESTAMPTZ,
    processed_at       TIMESTAMPTZ,
    reported_at        TIMESTAMPTZ,
    handed_over_at     TIMESTAMPTZ,
    tat_deadline       TIMESTAMPTZ,
    tat_breached       BOOLEAN      NOT NULL DEFAULT FALSE,
    notes              VARCHAR(500),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ,
    created_by         VARCHAR(36),
    updated_by         VARCHAR(36),
    deleted_at         TIMESTAMPTZ
);

CREATE INDEX idx_sample_order     ON orders.samples (order_id);
CREATE INDEX idx_sample_tenant    ON orders.samples (tenant_id);
CREATE INDEX idx_sample_status    ON orders.samples (tenant_id, status);
CREATE INDEX idx_sample_tat       ON orders.samples (tat_deadline) WHERE tat_breached = FALSE;

-- ── Sample Rejections ─────────────────────────────────────────────────────────

CREATE TABLE orders.sample_rejections (
    rejection_id          VARCHAR(36)  PRIMARY KEY,
    accession_id          VARCHAR(36)  NOT NULL REFERENCES orders.samples (accession_id),
    rejection_reason_code VARCHAR(30)  NOT NULL
                              CHECK (rejection_reason_code IN (
                                'hemolyzed','clotted','insufficient_volume',
                                'wrong_container','unlabelled','other')),
    notes                 VARCHAR(500),
    re_collection_required BOOLEAN     NOT NULL DEFAULT TRUE,
    rejected_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    rejected_by           VARCHAR(36)
);

CREATE INDEX idx_rejection_accession ON orders.sample_rejections (accession_id);

-- ── Sample Handovers ──────────────────────────────────────────────────────────

CREATE TABLE orders.sample_handovers (
    handover_id       VARCHAR(36)  PRIMARY KEY,
    accession_id      VARCHAR(36)  NOT NULL REFERENCES orders.samples (accession_id),
    handed_over_to    VARCHAR(200),
    method            VARCHAR(15)  CHECK (method IN ('manual','barcode_scan')),
    barcode_scanned   VARCHAR(30),
    handed_over_by    VARCHAR(36),
    handed_over_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_handover_accession ON orders.sample_handovers (accession_id);

-- ── Yearly sequences (created dynamically by OrderNumberGenerator) ────────────
-- Sequences are created on-demand by the Java service via JdbcTemplate.
-- This comment documents the expected naming convention:
--   orders.order_seq_YYYY      — order serial numbers
--   orders.accession_seq_YYYY  — accession serial numbers
