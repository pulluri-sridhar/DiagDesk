-- ============================================================
-- DiagDesk MVP Schema — Supabase Migration
-- Version: 20260724000001
-- Source: docs/design/data-model.md
--
-- Conventions:
--   - UUID PKs via gen_random_uuid()
--   - All timestamps: TIMESTAMPTZ (stored UTC)
--   - Money: NUMERIC(12,2)
--   - Soft-delete: deleted_at TIMESTAMPTZ (NULL = active)
--   - Tenant isolation: RLS on every tenant-scoped table
--     (policies check current_setting('app.tenant_id', true)
--     set by the application per request)
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Shared updated_at trigger function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Helper macro to wire the trigger on any table
CREATE OR REPLACE FUNCTION create_updated_at_trigger(tbl TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
    tbl, tbl
  );
END;
$$;

-- ============================================================
-- TENANCY & PLATFORM
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  region       TEXT        NOT NULL DEFAULT 'India',
  plan         TEXT        NOT NULL DEFAULT 'starter',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
SELECT create_updated_at_trigger('tenant');

CREATE TABLE IF NOT EXISTS branch (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID  NOT NULL REFERENCES tenant(id),
  name       TEXT  NOT NULL,
  type       TEXT  NOT NULL CHECK (type IN ('collection','hub')),
  address    TEXT,
  pincode    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_branch_tenant ON branch(tenant_id);
SELECT create_updated_at_trigger('branch');

-- Permission catalogue (global — not tenant-scoped)
CREATE TABLE IF NOT EXISTS permission (
  key        TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  category   TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'bool' CHECK (value_type IN ('bool','int','text'))
);

CREATE TABLE IF NOT EXISTS app_user (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  UUID        NOT NULL REFERENCES tenant(id),
  email                      TEXT,
  phone                      TEXT,
  kc_subject                 TEXT,       -- Keycloak sub claim
  status                     TEXT        NOT NULL DEFAULT 'active'
                                         CHECK (status IN ('active','inactive','suspended')),
  user_type                  TEXT        NOT NULL DEFAULT 'non_financial'
                                         CHECK (user_type IN ('non_financial','financial','admin','owner')),
  view_financial_reports_days INT,
  discount_limit_pct         NUMERIC(5,2),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                 TIMESTAMPTZ
);
CREATE INDEX idx_app_user_tenant     ON app_user(tenant_id);
CREATE INDEX idx_app_user_kc_subject ON app_user(kc_subject) WHERE kc_subject IS NOT NULL;
SELECT create_updated_at_trigger('app_user');

CREATE TABLE IF NOT EXISTS role (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID  NOT NULL REFERENCES tenant(id),
  name        TEXT  NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_role_tenant ON role(tenant_id);
SELECT create_updated_at_trigger('role');

CREATE TABLE IF NOT EXISTS user_role (
  user_id   UUID NOT NULL REFERENCES app_user(id),
  role_id   UUID NOT NULL REFERENCES role(id),
  branch_id UUID NOT NULL REFERENCES branch(id),
  PRIMARY KEY (user_id, role_id, branch_id)
);
CREATE INDEX idx_user_role_user   ON user_role(user_id);
CREATE INDEX idx_user_role_role   ON user_role(role_id);
CREATE INDEX idx_user_role_branch ON user_role(branch_id);

CREATE TABLE IF NOT EXISTS role_permission (
  role_id        UUID NOT NULL REFERENCES role(id),
  permission_key TEXT NOT NULL REFERENCES permission(key),
  value          TEXT,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS user_permission (
  user_id        UUID NOT NULL REFERENCES app_user(id),
  permission_key TEXT NOT NULL REFERENCES permission(key),
  effect         TEXT NOT NULL CHECK (effect IN ('grant','revoke')),
  value          TEXT,
  PRIMARY KEY (user_id, permission_key)
);

CREATE TABLE IF NOT EXISTS consent (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenant(id),
  patient_id UUID        NOT NULL,  -- FK added after patient table
  purpose    TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','obtained','revoked')),
  lang       TEXT        NOT NULL DEFAULT 'en',
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consent_tenant  ON consent(tenant_id);
SELECT create_updated_at_trigger('consent');

CREATE TABLE IF NOT EXISTS audit_log (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID        NOT NULL REFERENCES tenant(id),
  entity    TEXT        NOT NULL,
  entity_id UUID        NOT NULL,
  action    TEXT        NOT NULL,
  actor_id  UUID,
  prev_hash TEXT,
  hash      TEXT        NOT NULL,
  payload   JSONB       NOT NULL DEFAULT '{}',
  at        TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Append-only: no updated_at, no soft-delete
);
CREATE INDEX idx_audit_log_tenant    ON audit_log(tenant_id, at DESC);
CREATE INDEX idx_audit_log_entity    ON audit_log(entity, entity_id);

CREATE TABLE IF NOT EXISTS notification (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID        NOT NULL REFERENCES tenant(id),
  channel   TEXT        NOT NULL CHECK (channel IN ('whatsapp','sms','email','push')),
  template  TEXT        NOT NULL,
  "to"      TEXT        NOT NULL,
  status    TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','sent','failed')),
  at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_tenant ON notification(tenant_id, at DESC);

CREATE TABLE IF NOT EXISTS idempotency_key (
  key        TEXT        PRIMARY KEY,
  tenant_id  UUID        NOT NULL,
  scope      TEXT        NOT NULL,
  result_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox_event (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate  TEXT        NOT NULL,
  type       TEXT        NOT NULL,
  payload    JSONB       NOT NULL DEFAULT '{}',
  published  BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outbox_unpublished ON outbox_event(published, created_at) WHERE NOT published;

-- ============================================================
-- MASTER DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS department (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name      TEXT NOT NULL,
  code      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_department_tenant ON department(tenant_id);
SELECT create_updated_at_trigger('department');

-- Global NABL catalog (not tenant-scoped)
CREATE TABLE IF NOT EXISTS nabl_test_catalog (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  department     TEXT NOT NULL,
  method         TEXT,
  loinc          TEXT,
  default_ranges JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nabl_catalog_code ON nabl_test_catalog(code);

CREATE TABLE IF NOT EXISTS specimen_type (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_specimen_type_tenant ON specimen_type(tenant_id);
SELECT create_updated_at_trigger('specimen_type');

CREATE TABLE IF NOT EXISTS container (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name      TEXT NOT NULL,
  color     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_container_tenant ON container(tenant_id);
SELECT create_updated_at_trigger('container');

CREATE TABLE IF NOT EXISTS test (
  id               UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID     NOT NULL REFERENCES tenant(id),
  code             TEXT     NOT NULL,
  name             TEXT     NOT NULL,
  department_id    UUID     REFERENCES department(id),
  specimen_type_id UUID     REFERENCES specimen_type(id),
  method           TEXT,
  tat_hours        INT,
  gst_rate         NUMERIC(5,2) NOT NULL DEFAULT 0,
  active           BOOLEAN  NOT NULL DEFAULT true,
  is_custom        BOOLEAN  NOT NULL DEFAULT false,
  nabl_ref         UUID     REFERENCES nabl_test_catalog(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX idx_test_tenant     ON test(tenant_id);
CREATE INDEX idx_test_department ON test(department_id) WHERE department_id IS NOT NULL;
CREATE UNIQUE INDEX idx_test_tenant_code ON test(tenant_id, code) WHERE deleted_at IS NULL;
SELECT create_updated_at_trigger('test');

CREATE TABLE IF NOT EXISTS test_panel (
  id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID    NOT NULL REFERENCES tenant(id),
  name      TEXT    NOT NULL,
  active    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_test_panel_tenant ON test_panel(tenant_id);
SELECT create_updated_at_trigger('test_panel');

CREATE TABLE IF NOT EXISTS panel_item (
  panel_id UUID NOT NULL REFERENCES test_panel(id),
  test_id  UUID NOT NULL REFERENCES test(id),
  PRIMARY KEY (panel_id, test_id)
);
CREATE INDEX idx_panel_item_test ON panel_item(test_id);

CREATE TABLE IF NOT EXISTS health_package (
  id        UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID       NOT NULL REFERENCES tenant(id),
  name      TEXT       NOT NULL,
  price     NUMERIC(12,2) NOT NULL DEFAULT 0,
  active    BOOLEAN    NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_health_package_tenant ON health_package(tenant_id);
SELECT create_updated_at_trigger('health_package');

CREATE TABLE IF NOT EXISTS health_package_item (
  package_id UUID NOT NULL REFERENCES health_package(id),
  test_id    UUID NOT NULL REFERENCES test(id),
  PRIMARY KEY (package_id, test_id)
);

CREATE TABLE IF NOT EXISTS reference_range (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       UUID         NOT NULL REFERENCES test(id),
  analyte       TEXT         NOT NULL,
  sex           TEXT         CHECK (sex IN ('M','F','both')),
  age_min       INT,
  age_max       INT,
  low           NUMERIC(12,4),
  high          NUMERIC(12,4),
  critical_low  NUMERIC(12,4),
  critical_high NUMERIC(12,4),
  unit          TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_reference_range_test ON reference_range(test_id);
SELECT create_updated_at_trigger('reference_range');

CREATE TABLE IF NOT EXISTS rate_card (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name      TEXT NOT NULL,
  scheme    TEXT NOT NULL DEFAULT 'default'
                          CHECK (scheme IN ('default','CGHS','ECHS','TPA','B2B')),
  branch_id UUID REFERENCES branch(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rate_card_tenant ON rate_card(tenant_id);
SELECT create_updated_at_trigger('rate_card');

CREATE TABLE IF NOT EXISTS rate_card_item (
  rate_card_id UUID         NOT NULL REFERENCES rate_card(id),
  test_id      UUID         NOT NULL REFERENCES test(id),
  price        NUMERIC(12,2) NOT NULL,
  PRIMARY KEY (rate_card_id, test_id)
);
CREATE INDEX idx_rate_card_item_test ON rate_card_item(test_id);

CREATE TABLE IF NOT EXISTS report_stationery (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID    NOT NULL REFERENCES tenant(id),
  branch_id   UUID    REFERENCES branch(id),
  header_html TEXT,
  footer_html TEXT,
  logo_uri    TEXT,
  margins     JSONB   NOT NULL DEFAULT '{"top":20,"bottom":20,"left":15,"right":15}',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_stationery_tenant ON report_stationery(tenant_id);
SELECT create_updated_at_trigger('report_stationery');

CREATE TABLE IF NOT EXISTS report_template (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenant(id),
  name          TEXT NOT NULL,
  department_id UUID REFERENCES department(id),
  stationery_id UUID REFERENCES report_stationery(id),
  layout        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_template_tenant ON report_template(tenant_id);
SELECT create_updated_at_trigger('report_template');

-- ============================================================
-- PARTIES
-- ============================================================

CREATE TABLE IF NOT EXISTS patient (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id),
  mpi_no      TEXT NOT NULL,
  name        TEXT NOT NULL,
  age         INT,
  sex         TEXT CHECK (sex IN ('M','F','O')),
  phone       TEXT,
  email       TEXT,
  abha        TEXT,
  address     TEXT,
  pincode     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_patient_tenant  ON patient(tenant_id);
CREATE INDEX idx_patient_phone   ON patient(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX idx_patient_tenant_mpi ON patient(tenant_id, mpi_no) WHERE deleted_at IS NULL;
SELECT create_updated_at_trigger('patient');

-- Back-fill FK on consent now that patient exists
ALTER TABLE consent ADD CONSTRAINT fk_consent_patient
  FOREIGN KEY (patient_id) REFERENCES patient(id);
CREATE INDEX idx_consent_patient ON consent(patient_id);

CREATE TABLE IF NOT EXISTS referring_doctor (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenant(id),
  name       TEXT NOT NULL,
  speciality TEXT,
  phone      TEXT,
  clinic     TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_referring_doctor_tenant ON referring_doctor(tenant_id);
SELECT create_updated_at_trigger('referring_doctor');

CREATE TABLE IF NOT EXISTS b2b_partner (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name      TEXT NOT NULL,
  type      TEXT NOT NULL CHECK (type IN ('hospital','clinic','corporate','TPA','ref_lab')),
  gstin     TEXT,
  contact   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_b2b_partner_tenant ON b2b_partner(tenant_id);
SELECT create_updated_at_trigger('b2b_partner');

CREATE TABLE IF NOT EXISTS b2b_account (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       UUID         NOT NULL UNIQUE REFERENCES b2b_partner(id),
  rate_card_id     UUID         REFERENCES rate_card(id),
  credit_limit     NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_cycle_days INT        NOT NULL DEFAULT 30,
  status           TEXT         NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
SELECT create_updated_at_trigger('b2b_account');

CREATE TABLE IF NOT EXISTS professional_service_contract (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID         NOT NULL REFERENCES tenant(id),
  party_name   TEXT         NOT NULL,
  party_type   TEXT         NOT NULL CHECK (party_type IN ('consultant_pathologist','radiologist','other')),
  service_type TEXT         NOT NULL,
  basis        TEXT         NOT NULL CHECK (basis IN ('fixed','per_service')),
  rate         NUMERIC(12,2) NOT NULL,
  is_also_referrer BOOLEAN  NOT NULL DEFAULT false,
  active       BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_psc_tenant ON professional_service_contract(tenant_id);
SELECT create_updated_at_trigger('professional_service_contract');

CREATE TABLE IF NOT EXISTS service_engagement (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID         NOT NULL REFERENCES professional_service_contract(id),
  service_ref TEXT         NOT NULL,
  qty         INT          NOT NULL DEFAULT 1,
  amount      NUMERIC(12,2) NOT NULL,
  at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_engagement_contract ON service_engagement(contract_id);

-- ============================================================
-- ORDERS & SAMPLES
-- ============================================================

CREATE TABLE IF NOT EXISTS "order" (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenant(id),
  branch_id            UUID        NOT NULL REFERENCES branch(id),
  patient_id           UUID        NOT NULL REFERENCES patient(id),
  referring_doctor_id  UUID        REFERENCES referring_doctor(id),
  b2b_partner_id       UUID        REFERENCES b2b_partner(id),
  status               TEXT        NOT NULL DEFAULT 'registered'
                                   CHECK (status IN ('registered','sample_collected','processing','resulted','reported','delivered','cancelled')),
  ordered_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_tenant    ON "order"(tenant_id, ordered_at DESC);
CREATE INDEX idx_order_patient   ON "order"(patient_id);
CREATE INDEX idx_order_branch    ON "order"(branch_id);
CREATE INDEX idx_order_status    ON "order"(tenant_id, status);
SELECT create_updated_at_trigger('order');

CREATE TABLE IF NOT EXISTS order_item (
  id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id  UUID         NOT NULL REFERENCES "order"(id),
  test_id   UUID         NOT NULL REFERENCES test(id),
  price     NUMERIC(12,2) NOT NULL,
  status    TEXT         NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','processing','resulted','validated','reported')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_item_order ON order_item(order_id);
CREATE INDEX idx_order_item_test  ON order_item(test_id);
SELECT create_updated_at_trigger('order_item');

CREATE TABLE IF NOT EXISTS sample (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID        NOT NULL REFERENCES "order"(id),
  barcode      TEXT        NOT NULL,
  container_id UUID        REFERENCES container(id),
  status       TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','collected','received','processing','rejected')),
  collected_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sample_order   ON sample(order_id);
CREATE UNIQUE INDEX idx_sample_barcode ON sample(barcode);
SELECT create_updated_at_trigger('sample');

CREATE TABLE IF NOT EXISTS sample_event (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id   UUID        NOT NULL REFERENCES sample(id),
  event       TEXT        NOT NULL CHECK (event IN ('collected','received','in_process','rejected')),
  reason_code TEXT,
  actor_id    UUID        REFERENCES app_user(id),
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sample_event_sample ON sample_event(sample_id);

CREATE TABLE IF NOT EXISTS accession (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID        NOT NULL REFERENCES "order"(id),
  accession_no TEXT        NOT NULL UNIQUE,
  at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_accession_order ON accession(order_id);

-- ============================================================
-- RESULTS & REPORTS
-- ============================================================

CREATE TABLE IF NOT EXISTS result (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_item(id),
  status        TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','entered','validated','corrected')),
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('analyzer','manual')),
  instrument    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_result_order_item ON result(order_item_id);
SELECT create_updated_at_trigger('result');

CREATE TABLE IF NOT EXISTS result_value (
  id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID         NOT NULL REFERENCES result(id),
  analyte   TEXT         NOT NULL,
  value     TEXT,
  unit      TEXT,
  flag      TEXT         CHECK (flag IN ('H','L','critical','normal',null)),
  delta     NUMERIC(12,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_result_value_result ON result_value(result_id);

CREATE TABLE IF NOT EXISTS validation (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id    UUID        NOT NULL REFERENCES result(id),
  validated_by UUID        NOT NULL REFERENCES app_user(id),
  level        TEXT        NOT NULL CHECK (level IN ('tech','pathologist')),
  remark       TEXT,
  at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_validation_result ON validation(result_id);

CREATE TABLE IF NOT EXISTS report (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID    NOT NULL REFERENCES "order"(id),
  template_id     UUID    REFERENCES report_template(id),
  state           TEXT    NOT NULL DEFAULT 'draft'
                                   CHECK (state IN ('draft','in_review','preliminary','final')),
  reviewed_by     UUID    REFERENCES app_user(id),
  signed_by       UUID    REFERENCES app_user(id),
  pdf_uri         TEXT,
  signature       TEXT,
  version         INT     NOT NULL DEFAULT 1,
  print_count     INT     NOT NULL DEFAULT 0,
  handover_status TEXT    NOT NULL DEFAULT 'pending'
                                   CHECK (handover_status IN ('pending','handed_over')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_order ON report(order_id);
CREATE INDEX idx_report_state ON report(state);
SELECT create_updated_at_trigger('report');

CREATE TABLE IF NOT EXISTS report_delivery (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    UUID        NOT NULL REFERENCES report(id),
  channel      TEXT        NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
  initiated_by UUID        REFERENCES app_user(id),
  status       TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','sent','failed')),
  at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_delivery_report ON report_delivery(report_id);

CREATE TABLE IF NOT EXISTS report_print_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID        NOT NULL REFERENCES report(id),
  printed_by  UUID        NOT NULL REFERENCES app_user(id),
  copies      INT         NOT NULL DEFAULT 1,
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_print_report ON report_print_log(report_id);

CREATE TABLE IF NOT EXISTS report_handover (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID        NOT NULL REFERENCES report(id),
  handed_to       TEXT        NOT NULL,
  method          TEXT        NOT NULL CHECK (method IN ('barcode','manual')),
  scanned_barcode TEXT,
  by_user         UUID        NOT NULL REFERENCES app_user(id),
  at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_handover_report ON report_handover(report_id);

-- ============================================================
-- BILLING
-- ============================================================

CREATE TABLE IF NOT EXISTS invoice (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID         NOT NULL REFERENCES tenant(id),
  order_id              UUID         NOT NULL REFERENCES "order"(id),
  subtotal              NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount              NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_justification TEXT,
  discount_approved_by  UUID         REFERENCES app_user(id),
  gst                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  due                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  payer_type            TEXT         NOT NULL DEFAULT 'b2c' CHECK (payer_type IN ('b2c','b2b')),
  b2b_account_id        UUID         REFERENCES b2b_account(id),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_tenant ON invoice(tenant_id);
CREATE INDEX idx_invoice_order  ON invoice(order_id);
SELECT create_updated_at_trigger('invoice');

CREATE TABLE IF NOT EXISTS invoice_line (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID         NOT NULL REFERENCES invoice(id),
  test_id    UUID         NOT NULL REFERENCES test(id),
  price      NUMERIC(12,2) NOT NULL,
  gst_rate   NUMERIC(5,2)  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_line_invoice ON invoice_line(invoice_id);

CREATE TABLE IF NOT EXISTS payment (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID         NOT NULL REFERENCES invoice(id),
  mode       TEXT         NOT NULL CHECK (mode IN ('cash','upi','card','partial','credit')),
  amount     NUMERIC(12,2) NOT NULL,
  ref        TEXT,
  at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_invoice ON payment(invoice_id);

CREATE TABLE IF NOT EXISTS b2b_receivable (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_account_id UUID         NOT NULL REFERENCES b2b_account(id),
  invoice_id     UUID         NOT NULL REFERENCES invoice(id),
  amount         NUMERIC(12,2) NOT NULL,
  days_overdue   INT          NOT NULL DEFAULT 0,
  status         TEXT         NOT NULL DEFAULT 'open'
                                        CHECK (status IN ('open','partial','settled','written_off')),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_b2b_receivable_account ON b2b_receivable(b2b_account_id);
CREATE INDEX idx_b2b_receivable_invoice ON b2b_receivable(invoice_id);
SELECT create_updated_at_trigger('b2b_receivable');

-- ============================================================
-- INVENTORY & EXPENSES
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_item (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID    NOT NULL REFERENCES tenant(id),
  branch_id         UUID    NOT NULL REFERENCES branch(id),
  name              TEXT    NOT NULL,
  category          TEXT    NOT NULL,
  unit              TEXT    NOT NULL,
  qty_on_hand       NUMERIC(12,4) NOT NULL DEFAULT 0,
  reorder_threshold NUMERIC(12,4) NOT NULL DEFAULT 0,
  batch_no          TEXT,
  expiry            DATE,
  supplier_id       UUID,   -- FK to supplier (V1 table; nullable for MVP)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX idx_inventory_tenant ON inventory_item(tenant_id);
CREATE INDEX idx_inventory_branch ON inventory_item(branch_id);
SELECT create_updated_at_trigger('inventory_item');

CREATE TABLE IF NOT EXISTS test_kit (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID    NOT NULL REFERENCES tenant(id),
  inventory_item_id UUID    NOT NULL REFERENCES inventory_item(id),
  name              TEXT    NOT NULL,
  tests_per_kit     INT     NOT NULL,
  tests_remaining   INT     NOT NULL,
  lot_no            TEXT,
  expiry            DATE,
  linked_test_id    UUID    REFERENCES test(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_test_kit_tenant    ON test_kit(tenant_id);
CREATE INDEX idx_test_kit_inventory ON test_kit(inventory_item_id);
SELECT create_updated_at_trigger('test_kit');

CREATE TABLE IF NOT EXISTS stock_ledger (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL REFERENCES tenant(id),
  inventory_item_id UUID         NOT NULL REFERENCES inventory_item(id),
  txn               TEXT         NOT NULL CHECK (txn IN ('receipt','issue','consumption','adjust')),
  qty               NUMERIC(12,4) NOT NULL,
  ref               TEXT,
  actor_id          UUID         REFERENCES app_user(id),
  at                TIMESTAMPTZ  NOT NULL DEFAULT now()
  -- Append-only: no updated_at
);
CREATE INDEX idx_stock_ledger_tenant    ON stock_ledger(tenant_id, at DESC);
CREATE INDEX idx_stock_ledger_inventory ON stock_ledger(inventory_item_id);

CREATE TABLE IF NOT EXISTS expense_category (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name      TEXT NOT NULL
              CHECK (name IN ('rent','salaries','utilities','reagents','maintenance','petty_cash','misc')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expense_category_tenant ON expense_category(tenant_id);
SELECT create_updated_at_trigger('expense_category');

CREATE TABLE IF NOT EXISTS expense (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES tenant(id),
  branch_id   UUID         NOT NULL REFERENCES branch(id),
  category_id UUID         NOT NULL REFERENCES expense_category(id),
  amount      NUMERIC(12,2) NOT NULL,
  mode        TEXT         NOT NULL CHECK (mode IN ('cash','upi','bank')),
  payee       TEXT,
  note        TEXT,
  incurred_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  entered_by  UUID         REFERENCES app_user(id),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_expense_tenant ON expense(tenant_id, incurred_at DESC);
CREATE INDEX idx_expense_branch ON expense(branch_id);
SELECT create_updated_at_trigger('expense');

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
-- Tenant isolation: application sets `app.tenant_id` session var
-- before executing any query. Service role bypasses all RLS.
-- Auth: JWT claims will be used once Keycloak is wired up.
-- For now: service role has full access; anon role is blocked.

ALTER TABLE tenant                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE role                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role                ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permission          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission          ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification             ENABLE ROW LEVEL SECURITY;
ALTER TABLE department               ENABLE ROW LEVEL SECURITY;
ALTER TABLE specimen_type            ENABLE ROW LEVEL SECURITY;
ALTER TABLE container                ENABLE ROW LEVEL SECURITY;
ALTER TABLE test                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_panel               ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_package           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_card                ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_stationery        ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_template          ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE referring_doctor         ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_partner              ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_service_contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item           ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_kit                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger             ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_category         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense                  ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped policy template (applied per table below)
-- Uses current_setting('app.tenant_id', true) which the app sets per-request.
-- The `true` flag means it returns NULL (not error) when not set — safe for migrations.

CREATE POLICY tenant_isolation ON tenant
  USING (id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON branch
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON app_user
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON role
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON consent
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON notification
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON department
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON specimen_type
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON container
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON test
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON test_panel
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON health_package
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON rate_card
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON report_stationery
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON report_template
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON patient
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON referring_doctor
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON b2b_partner
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON professional_service_contract
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON "order"
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON invoice
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON inventory_item
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON test_kit
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON stock_ledger
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON expense_category
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON expense
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- order_item, sample, result share the order's tenant — enforce via join policy
CREATE POLICY tenant_isolation ON order_item
  USING (EXISTS (
    SELECT 1 FROM "order" o
    WHERE o.id = order_item.order_id
    AND o.tenant_id::text = current_setting('app.tenant_id', true)
  ));

CREATE POLICY tenant_isolation ON sample
  USING (EXISTS (
    SELECT 1 FROM "order" o
    WHERE o.id = sample.order_id
    AND o.tenant_id::text = current_setting('app.tenant_id', true)
  ));

-- ============================================================
-- SEED: Permission catalogue (system-level permissions)
-- ============================================================
INSERT INTO permission (key, label, category, value_type) VALUES
  ('view_dashboard',          'View Dashboard',                   'general',   'bool'),
  ('manage_patients',         'Manage Patients',                  'patients',  'bool'),
  ('view_reports',            'View Reports',                     'reports',   'bool'),
  ('sign_reports',            'Sign / Finalize Reports',          'reports',   'bool'),
  ('manage_inventory',        'Manage Inventory',                 'inventory', 'bool'),
  ('view_financials',         'View Financial Reports',           'finance',   'bool'),
  ('manage_rate_cards',       'Manage Rate Cards & Packages',     'finance',   'bool'),
  ('apply_discounts',         'Apply Discounts',                  'finance',   'bool'),
  ('approve_large_discounts', 'Approve Discounts Above Limit',    'finance',   'bool'),
  ('manage_users',            'Manage Users & Roles',             'admin',     'bool'),
  ('manage_branches',         'Manage Branches',                  'admin',     'bool'),
  ('view_audit_logs',         'View Audit Logs',                  'admin',     'bool'),
  ('manage_b2b',              'Manage B2B Partners & Accounts',   'b2b',       'bool'),
  ('collect_samples',         'Collect Samples',                  'lab',       'bool'),
  ('enter_results',           'Enter Results',                    'lab',       'bool'),
  ('validate_results',        'Validate Results (Tech)',          'lab',       'bool'),
  ('pathologist_validate',    'Validate Results (Pathologist)',   'lab',       'bool')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- CLEANUP helper function (only used above, safe to drop)
-- ============================================================
DROP FUNCTION IF EXISTS create_updated_at_trigger(TEXT);
