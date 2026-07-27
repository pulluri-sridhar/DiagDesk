-- ============================================================
-- Catalog & Rate-Card Service — PostgreSQL Schema
-- Schema: catalog
-- ============================================================

CREATE SCHEMA IF NOT EXISTS catalog;

-- ── Departments ──────────────────────────────────────────────────────────────

CREATE TABLE catalog.departments (
    department_id   VARCHAR(36)  PRIMARY KEY,
    tenant_id       VARCHAR(36)  NOT NULL,
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(20)  NOT NULL,
    section_head_id VARCHAR(36),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT uq_dept_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_dept_tenant ON catalog.departments (tenant_id);

-- ── NABL Catalogue (global, seeded — no tenant_id) ───────────────────────────

CREATE TABLE catalog.nabl_catalogue (
    nabl_code               VARCHAR(30)  PRIMARY KEY,
    name                    VARCHAR(200) NOT NULL,
    method                  VARCHAR(100),
    specimen_type           VARCHAR(100),
    category                VARCHAR(50),
    unit                    VARCHAR(50),
    container               VARCHAR(100),
    default_reference_ranges JSONB
);

-- ── Tests ─────────────────────────────────────────────────────────────────────

CREATE TABLE catalog.tests (
    test_id         VARCHAR(36)  PRIMARY KEY,
    tenant_id       VARCHAR(36)  NOT NULL,
    code            VARCHAR(30)  NOT NULL,
    name            VARCHAR(200) NOT NULL,
    method          VARCHAR(100),
    unit            VARCHAR(50),
    specimen_type   VARCHAR(100),
    container       VARCHAR(100),
    tat_hours       INTEGER,
    department_id   VARCHAR(36)  REFERENCES catalog.departments (department_id) ON DELETE SET NULL,
    is_custom       BOOLEAN      NOT NULL DEFAULT FALSE,
    nabl_code       VARCHAR(30)  REFERENCES catalog.nabl_catalogue (nabl_code) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT uq_test_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_test_tenant     ON catalog.tests (tenant_id);
CREATE INDEX idx_test_department ON catalog.tests (department_id);
CREATE INDEX idx_test_nabl       ON catalog.tests (nabl_code);

-- ── Test Reference Ranges ─────────────────────────────────────────────────────

CREATE TABLE catalog.test_reference_ranges (
    range_id        VARCHAR(36)    PRIMARY KEY,
    test_id         VARCHAR(36)    NOT NULL REFERENCES catalog.tests (test_id) ON DELETE CASCADE,
    age_min_years   INTEGER,
    age_max_years   INTEGER,
    gender          VARCHAR(10)    NOT NULL DEFAULT 'all' CHECK (gender IN ('all','male','female')),
    lower_limit     NUMERIC(12, 4),
    upper_limit     NUMERIC(12, 4),
    critical_low    NUMERIC(12, 4),
    critical_high   NUMERIC(12, 4),
    unit            VARCHAR(50)
);

CREATE INDEX idx_refrange_test ON catalog.test_reference_ranges (test_id);

-- ── Panels & Packages ─────────────────────────────────────────────────────────

CREATE TABLE catalog.panels (
    panel_id    VARCHAR(36)  PRIMARY KEY,
    tenant_id   VARCHAR(36)  NOT NULL,
    name        VARCHAR(200) NOT NULL,
    type        VARCHAR(10)  NOT NULL CHECK (type IN ('panel','package_')),
    description VARCHAR(500),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    created_by  VARCHAR(36),
    updated_by  VARCHAR(36),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_panel_tenant ON catalog.panels (tenant_id);
CREATE INDEX idx_panel_type   ON catalog.panels (tenant_id, type);

CREATE TABLE catalog.panel_tests (
    panel_id    VARCHAR(36) NOT NULL REFERENCES catalog.panels (panel_id) ON DELETE CASCADE,
    test_id     VARCHAR(36) NOT NULL REFERENCES catalog.tests  (test_id)  ON DELETE CASCADE,
    PRIMARY KEY (panel_id, test_id)
);

-- ── Rate Cards ────────────────────────────────────────────────────────────────

CREATE TABLE catalog.rate_cards (
    rate_card_id    VARCHAR(36)  PRIMARY KEY,
    tenant_id       VARCHAR(36)  NOT NULL,
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(15)  NOT NULL CHECK (type IN ('branch','b2b_partner','scheme')),
    branch_id       VARCHAR(36),
    partner_id      VARCHAR(36),
    scheme_code     VARCHAR(30),
    effective_from  DATE,
    effective_to    DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_rc_tenant  ON catalog.rate_cards (tenant_id);
CREATE INDEX idx_rc_type    ON catalog.rate_cards (tenant_id, type);
CREATE INDEX idx_rc_branch  ON catalog.rate_cards (branch_id);
CREATE INDEX idx_rc_partner ON catalog.rate_cards (partner_id);
CREATE INDEX idx_rc_scheme  ON catalog.rate_cards (scheme_code);

CREATE TABLE catalog.rate_card_items (
    item_id         VARCHAR(36)     PRIMARY KEY,
    rate_card_id    VARCHAR(36)     NOT NULL REFERENCES catalog.rate_cards (rate_card_id) ON DELETE CASCADE,
    test_id         VARCHAR(36)     NOT NULL,
    price           NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    gst_rate        NUMERIC(5, 4)   NOT NULL DEFAULT 0,
    is_gst_exempt   BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_rci_card ON catalog.rate_card_items (rate_card_id);
CREATE INDEX idx_rci_test ON catalog.rate_card_items (test_id);

-- ── Letterheads ───────────────────────────────────────────────────────────────

CREATE TABLE catalog.letterheads (
    letterhead_id     VARCHAR(36)  PRIMARY KEY,
    tenant_id         VARCHAR(36)  NOT NULL,
    branch_id         VARCHAR(36),
    logo_url          VARCHAR(500),
    header_html       TEXT,
    footer_html       TEXT,
    margin_top_mm     INTEGER      NOT NULL DEFAULT 20,
    margin_bottom_mm  INTEGER      NOT NULL DEFAULT 20,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ,
    created_by        VARCHAR(36),
    updated_by        VARCHAR(36),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_lh_tenant ON catalog.letterheads (tenant_id);
CREATE INDEX idx_lh_branch ON catalog.letterheads (branch_id);

-- ── NABL Catalogue Seed Data ──────────────────────────────────────────────────

INSERT INTO catalog.nabl_catalogue (nabl_code, name, method, specimen_type, category, unit, container, default_reference_ranges) VALUES
('NABL-HEM-001', 'Complete Blood Count (CBC)', 'Automated Analyzer', 'Blood', 'Haematology', 'cells/µL', 'EDTA',
 '[{"gender":"all","ageMinYears":18,"ageMaxYears":null,"lowerLimit":4.5,"upperLimit":11.0,"criticalLow":2.0,"criticalHigh":30.0,"unit":"×10³/µL"}]'),
('NABL-HEM-002', 'Haemoglobin', 'Cyanmethaemoglobin', 'Blood', 'Haematology', 'g/dL', 'EDTA',
 '[{"gender":"male","ageMinYears":18,"ageMaxYears":null,"lowerLimit":13.5,"upperLimit":17.5,"criticalLow":7.0,"criticalHigh":20.0,"unit":"g/dL"},{"gender":"female","ageMinYears":18,"ageMaxYears":null,"lowerLimit":12.0,"upperLimit":16.0,"criticalLow":7.0,"criticalHigh":20.0,"unit":"g/dL"}]'),
('NABL-BIO-001', 'Blood Glucose (Fasting)', 'Enzymatic (GOD-POD)', 'Blood', 'Biochemistry', 'mg/dL', 'Fluoride',
 '[{"gender":"all","ageMinYears":18,"ageMaxYears":null,"lowerLimit":70.0,"upperLimit":100.0,"criticalLow":40.0,"criticalHigh":500.0,"unit":"mg/dL"}]'),
('NABL-BIO-002', 'HbA1c', 'HPLC', 'Blood', 'Biochemistry', '%', 'EDTA',
 '[{"gender":"all","ageMinYears":18,"ageMaxYears":null,"lowerLimit":null,"upperLimit":5.7,"criticalHigh":14.0,"unit":"%"}]'),
('NABL-BIO-003', 'Serum Creatinine', 'Jaffe Method', 'Blood', 'Biochemistry', 'mg/dL', 'Plain/SST',
 '[{"gender":"male","ageMinYears":18,"ageMaxYears":null,"lowerLimit":0.74,"upperLimit":1.35,"criticalHigh":10.0,"unit":"mg/dL"},{"gender":"female","ageMinYears":18,"ageMaxYears":null,"lowerLimit":0.59,"upperLimit":1.04,"criticalHigh":10.0,"unit":"mg/dL"}]'),
('NABL-BIO-004', 'Total Bilirubin', 'Diazo Method', 'Blood', 'Biochemistry', 'mg/dL', 'Plain/SST',
 '[{"gender":"all","ageMinYears":18,"ageMaxYears":null,"lowerLimit":0.2,"upperLimit":1.2,"criticalHigh":15.0,"unit":"mg/dL"}]'),
('NABL-BIO-005', 'SGPT / ALT', 'IFCC Method', 'Blood', 'Biochemistry', 'U/L', 'Plain/SST',
 '[{"gender":"male","ageMinYears":18,"ageMaxYears":null,"lowerLimit":7,"upperLimit":56,"criticalHigh":1000,"unit":"U/L"},{"gender":"female","ageMinYears":18,"ageMaxYears":null,"lowerLimit":7,"upperLimit":45,"criticalHigh":1000,"unit":"U/L"}]'),
('NABL-BIO-006', 'Serum Urea', 'Urease Method', 'Blood', 'Biochemistry', 'mg/dL', 'Plain/SST',
 '[{"gender":"all","ageMinYears":18,"ageMaxYears":null,"lowerLimit":15,"upperLimit":45,"criticalHigh":200,"unit":"mg/dL"}]'),
('NABL-BIO-007', 'Serum Uric Acid', 'Enzymatic Method', 'Blood', 'Biochemistry', 'mg/dL', 'Plain/SST',
 '[{"gender":"male","ageMinYears":18,"ageMaxYears":null,"lowerLimit":3.5,"upperLimit":7.2,"unit":"mg/dL"},{"gender":"female","ageMinYears":18,"ageMaxYears":null,"lowerLimit":2.6,"upperLimit":6.0,"unit":"mg/dL"}]'),
('NABL-LIP-001', 'Lipid Profile', 'Enzymatic', 'Blood', 'Biochemistry', 'mg/dL', 'Plain/SST',
 '[{"gender":"all","ageMinYears":18,"ageMaxYears":null,"lowerLimit":null,"upperLimit":200.0,"unit":"mg/dL (Total Cholesterol)"}]'),
('NABL-THY-001', 'TSH (3rd Gen)', 'Chemiluminescence (CLIA)', 'Blood', 'Endocrinology', 'µIU/mL', 'Plain/SST',
 '[{"gender":"all","ageMinYears":18,"ageMaxYears":null,"lowerLimit":0.4,"upperLimit":4.0,"criticalLow":0.01,"criticalHigh":100.0,"unit":"µIU/mL"}]'),
('NABL-THY-002', 'Free T3', 'CLIA', 'Blood', 'Endocrinology', 'pg/mL', 'Plain/SST',
 '[{"gender":"all","ageMinYears":18,"ageMaxYears":null,"lowerLimit":2.3,"upperLimit":4.2,"unit":"pg/mL"}]'),
('NABL-THY-003', 'Free T4', 'CLIA', 'Blood', 'Endocrinology', 'ng/dL', 'Plain/SST',
 '[{"gender":"all","ageMinYears":18,"ageMaxYears":null,"lowerLimit":0.89,"upperLimit":1.76,"unit":"ng/dL"}]'),
('NABL-URI-001', 'Urine Routine & Microscopy', 'Manual + Microscopy', 'Urine', 'Urinalysis', 'Various', 'Sterile container', null),
('NABL-MIC-001', 'Blood Culture & Sensitivity', 'Automated (BacT/ALERT)', 'Blood', 'Microbiology', 'N/A', 'BacT/ALERT bottle', null),
('NABL-MIC-002', 'Urine Culture & Sensitivity', 'Semi-quantitative culture', 'Urine', 'Microbiology', 'CFU/mL', 'Sterile container', null),
('NABL-SER-001', 'HIV 1 & 2 Antibody', 'ELISA / CLIA', 'Blood', 'Serology', 'Reactive/Non-reactive', 'Plain/SST', null),
('NABL-SER-002', 'HBsAg', 'ELISA / CLIA', 'Blood', 'Serology', 'Reactive/Non-reactive', 'Plain/SST', null),
('NABL-SER-003', 'Anti-HCV', 'ELISA / CLIA', 'Blood', 'Serology', 'Reactive/Non-reactive', 'Plain/SST', null),
('NABL-SER-004', 'Dengue NS1 Antigen', 'Rapid / ELISA', 'Blood', 'Serology', 'Reactive/Non-reactive', 'Plain/SST', null),
('NABL-SER-005', 'Malaria Antigen (P.falciparum + P.vivax)', 'Rapid Diagnostic Test', 'Blood', 'Serology', 'Positive/Negative', 'EDTA', null),
('NABL-VIT-001', 'Vitamin D (25-OH)', 'CLIA', 'Blood', 'Endocrinology', 'ng/mL', 'Plain/SST',
 '[{"gender":"all","ageMinYears":18,"ageMaxYears":null,"lowerLimit":30.0,"upperLimit":100.0,"criticalLow":10.0,"unit":"ng/mL"}]'),
('NABL-VIT-002', 'Vitamin B12', 'CLIA', 'Blood', 'Endocrinology', 'pg/mL', 'Plain/SST',
 '[{"gender":"all","ageMinYears":18,"ageMaxYears":null,"lowerLimit":211.0,"upperLimit":946.0,"criticalLow":100.0,"unit":"pg/mL"}]'),
('NABL-COA-001', 'Prothrombin Time (PT/INR)', 'Clot Detection', 'Blood', 'Haematology', 'seconds / ratio', 'Citrate',
 '[{"gender":"all","ageMinYears":18,"ageMaxYears":null,"lowerLimit":11.0,"upperLimit":13.5,"criticalHigh":35.0,"unit":"seconds"}]');
