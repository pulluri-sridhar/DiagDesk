-- ============================================================
-- DiagDesk — Patient Service Schema
-- V1: Initial schema (patients + consent_records)
--
-- Multi-tenancy: Row-Level Security (RLS) enforces tenant
-- isolation at the DB layer as the last line of defense.
-- Application layer also always filters by tenant_id.
--
-- Soft-delete: deleted_at column; never hard-delete clinical data (NABL).
-- Timestamps: TIMESTAMPTZ (UTC stored, displayed in IST on client).
-- ============================================================

CREATE SCHEMA IF NOT EXISTS patient;

SET search_path TO patient, public;

-- ── Patients ─────────────────────────────────────────────────────────────────

CREATE TABLE patients (
    patient_id          VARCHAR(36)     PRIMARY KEY,
    uhid                VARCHAR(20)     NOT NULL UNIQUE,
    tenant_id           VARCHAR(36)     NOT NULL,

    -- Demographics
    first_name          VARCHAR(100)    NOT NULL,
    last_name           VARCHAR(100)    NOT NULL,
    date_of_birth       DATE            NOT NULL,
    gender              VARCHAR(10)     NOT NULL CHECK (gender IN ('male','female','other')),
    phone               VARCHAR(20)     NOT NULL,
    email               VARCHAR(255),

    -- Address (flattened for query performance)
    address_line1       VARCHAR(255),
    address_city        VARCHAR(100),
    address_state       VARCHAR(100),
    address_pincode     VARCHAR(6),

    -- Clinical
    aadhaar_last4       VARCHAR(4)      CHECK (aadhaar_last4 ~ '^[0-9]{4}$'),
    blood_group         VARCHAR(5)      CHECK (blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-','unknown')),
    allergies           JSONB           DEFAULT '[]',
    referred_by_doctor_id VARCHAR(36),

    -- Consent
    consent_status      VARCHAR(20)     NOT NULL DEFAULT 'pending'
                                        CHECK (consent_status IN ('obtained','pending','revoked')),

    -- MPI dedup — Soundex phonetic codes (pre-computed at write time)
    first_name_soundex  VARCHAR(10),
    last_name_soundex   VARCHAR(10),

    -- Audit (managed by Spring Data JPA @CreatedDate / @LastModifiedDate)
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    deleted_at          TIMESTAMPTZ     -- NULL = active; soft-delete only
);

-- Indexes
CREATE INDEX idx_patients_tenant_id  ON patients(tenant_id);
CREATE INDEX idx_patients_phone      ON patients(phone);
CREATE INDEX idx_patients_soundex    ON patients(first_name_soundex, last_name_soundex);
CREATE INDEX idx_patients_dob        ON patients(date_of_birth);
CREATE INDEX idx_patients_tenant_created ON patients(tenant_id, created_at DESC)
    WHERE deleted_at IS NULL;    -- partial index: only active patients

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION patient.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION patient.update_updated_at();

-- ── Row-Level Security ────────────────────────────────────────────────────────
--
-- The application sets: SET LOCAL app.tenant_id = '<uuid>';
-- at the start of each transaction (via Hibernate interceptor in V2).
-- For now, the policy is defined but enforces based on current_setting.
--
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;

CREATE POLICY patients_tenant_isolation ON patients
    USING (tenant_id = current_setting('app.tenant_id', TRUE))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', TRUE));

-- Superuser / migration role bypasses RLS
CREATE ROLE diagdesk_app;              -- application DB user inherits this
GRANT SELECT, INSERT, UPDATE ON patients TO diagdesk_app;

-- ── Consent Records ───────────────────────────────────────────────────────────

CREATE TABLE consent_records (
    consent_id              VARCHAR(36)     PRIMARY KEY,
    patient_id              VARCHAR(36)     NOT NULL REFERENCES patients(patient_id),
    tenant_id               VARCHAR(36)     NOT NULL,

    consent_type            VARCHAR(50)     NOT NULL
                                            CHECK (consent_type IN ('data_processing','marketing','research')),
    purpose                 VARCHAR(255)    NOT NULL,
    language_code           VARCHAR(5)      DEFAULT 'en',
    consent_text_version    VARCHAR(20)     NOT NULL,

    ip_address              VARCHAR(45),
    captured_via            VARCHAR(20)     CHECK (captured_via IN ('counter','kiosk','app','patient_app')),
    captured_at             TIMESTAMPTZ     NOT NULL,

    -- Tamper-evidence: SHA-256 of (patient_id + type + purpose + version + captured_at)
    hash                    VARCHAR(64)     NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'active'
                                            CHECK (status IN ('active','revoked')),

    revoked_at              TIMESTAMPTZ,
    revoked_by              VARCHAR(36),

    -- Audit
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              VARCHAR(36),
    updated_by              VARCHAR(36),
    deleted_at              TIMESTAMPTZ     -- append-only; should remain NULL for consent records
);

CREATE INDEX idx_consent_patient_id ON consent_records(patient_id);
CREATE INDEX idx_consent_tenant_id  ON consent_records(tenant_id);
CREATE INDEX idx_consent_type       ON consent_records(patient_id, consent_type, status);

CREATE TRIGGER trg_consent_updated_at
    BEFORE UPDATE ON consent_records
    FOR EACH ROW EXECUTE FUNCTION patient.update_updated_at();

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records FORCE ROW LEVEL SECURITY;

CREATE POLICY consent_tenant_isolation ON consent_records
    USING (tenant_id = current_setting('app.tenant_id', TRUE))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', TRUE));

GRANT SELECT, INSERT, UPDATE ON consent_records TO diagdesk_app;

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE patients          IS 'Master Patient Index — one record per unique patient per tenant.';
COMMENT ON COLUMN patients.uhid    IS 'Unique Health ID: LAB-YYYY-NNNNN. Generated by Redis sequence per tenant per year.';
COMMENT ON COLUMN patients.first_name_soundex IS 'Soundex code of first_name — pre-computed for MPI dedup queries.';
COMMENT ON COLUMN patients.allergies          IS 'JSON array of allergy strings e.g. ["penicillin","latex"].';
COMMENT ON TABLE consent_records   IS 'DPDP consent records — append-only. Never hard-delete.';
COMMENT ON COLUMN consent_records.hash IS 'SHA-256(patient_id||type||purpose||version||captured_at) for tamper-evidence.';
