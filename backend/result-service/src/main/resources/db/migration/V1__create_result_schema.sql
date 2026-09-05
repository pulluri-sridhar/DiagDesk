-- ============================================================
-- Result & Validation Service — PostgreSQL Schema
-- Schema: results
-- ============================================================

CREATE SCHEMA IF NOT EXISTS results;

-- ── Test Results ──────────────────────────────────────────────────────────────
-- One row per test result. Amendments bump the version; the latest value is always here.
-- Historical values are in result_amendments.

CREATE TABLE results.test_results (
    result_id           VARCHAR(36)  PRIMARY KEY,
    accession_id        VARCHAR(36)  NOT NULL,
    test_id             VARCHAR(36)  NOT NULL,
    order_id            VARCHAR(36)  NOT NULL,
    patient_id          VARCHAR(36)  NOT NULL,
    tenant_id           VARCHAR(36)  NOT NULL,
    branch_id           VARCHAR(36)  NOT NULL,
    value               VARCHAR(100) NOT NULL,
    unit                VARCHAR(50),
    method              VARCHAR(50),
    source              VARCHAR(20)  NOT NULL
                            CHECK (source IN ('ANALYZER', 'MANUAL')),
    entered_by          VARCHAR(36),
    raw_hl7_segment     TEXT,
    flags               VARCHAR(100),  -- H, L, CRITICAL_HIGH, CRITICAL_LOW (comma-separated)
    reference_range     VARCHAR(50),   -- "4.0 - 11.0"
    validation_status   VARCHAR(30)    NOT NULL DEFAULT 'PENDING'
                            CHECK (validation_status IN (
                              'PENDING', 'AUTO_VALIDATED', 'PENDING_MANUAL_VALIDATION',
                              'PENDING_SIGNOFF', 'SIGNED_OFF', 'PENDING_RERUN')),
    version             INTEGER        NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ,
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_tr_tenant      ON results.test_results (tenant_id);
CREATE INDEX idx_tr_accession   ON results.test_results (accession_id);
CREATE INDEX idx_tr_order       ON results.test_results (order_id);
CREATE INDEX idx_tr_patient_test ON results.test_results (tenant_id, patient_id, test_id);
CREATE INDEX idx_tr_status      ON results.test_results (tenant_id, validation_status)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_tr_critical    ON results.test_results (tenant_id, created_at DESC)
    WHERE flags LIKE '%CRITICAL%' AND deleted_at IS NULL;

-- ── Result Amendments ─────────────────────────────────────────────────────────
-- Full amendment history — every time a result value is changed.

CREATE TABLE results.result_amendments (
    amendment_id        VARCHAR(36)  PRIMARY KEY,
    result_id           VARCHAR(36)  NOT NULL REFERENCES results.test_results (result_id),
    previous_value      VARCHAR(100) NOT NULL,
    new_value           VARCHAR(100) NOT NULL,
    amendment_reason    VARCHAR(500),
    amended_by          VARCHAR(36),
    amended_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version             INTEGER      NOT NULL
);

CREATE INDEX idx_ra_result ON results.result_amendments (result_id);

-- ── Result Validations ────────────────────────────────────────────────────────
-- Level-1 (technician) and Level-2 (pathologist, pre-signoff) notes.

CREATE TABLE results.result_validations (
    validation_id   VARCHAR(36)  PRIMARY KEY,
    result_id       VARCHAR(36)  NOT NULL REFERENCES results.test_results (result_id),
    level           INTEGER      NOT NULL CHECK (level IN (1, 2)),
    notes           VARCHAR(500),
    validated_by    VARCHAR(36),
    validated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_rv_result ON results.result_validations (result_id);

-- ── Result Sign-offs ──────────────────────────────────────────────────────────
-- Pathologist digital signature or PIN-based sign-off.

CREATE TABLE results.result_signoffs (
    signoff_id      VARCHAR(36)  PRIMARY KEY,
    result_id       VARCHAR(36)  NOT NULL REFERENCES results.test_results (result_id),
    signature_type  VARCHAR(10)  CHECK (signature_type IN ('DIGITAL', 'PIN')),
    notes           VARCHAR(500),
    signed_by       VARCHAR(36),
    signed_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_rs_result ON results.result_signoffs (result_id);

-- ── Critical Acknowledgements ─────────────────────────────────────────────────
-- Mandatory callback log when critical values (CRITICAL_HIGH / CRITICAL_LOW) are reported.

CREATE TABLE results.critical_acknowledgements (
    acknowledgement_id  VARCHAR(36)  PRIMARY KEY,
    result_id           VARCHAR(36)  NOT NULL REFERENCES results.test_results (result_id),
    called_at           TIMESTAMPTZ,
    called_to_phone     VARCHAR(20),
    caller_id           VARCHAR(36),
    response_notes      VARCHAR(500),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_ca_result ON results.critical_acknowledgements (result_id);

-- ── Repeat Requests ───────────────────────────────────────────────────────────
-- Re-run requests raised when a result is rejected or found erroneous.

CREATE TABLE results.repeat_requests (
    repeat_request_id   VARCHAR(36)  PRIMARY KEY,
    result_id           VARCHAR(36)  NOT NULL REFERENCES results.test_results (result_id),
    reason              VARCHAR(500),
    priority            VARCHAR(10)  CHECK (priority IN ('routine', 'urgent', 'stat')),
    requested_by        VARCHAR(36),
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_rr_result ON results.repeat_requests (result_id);
