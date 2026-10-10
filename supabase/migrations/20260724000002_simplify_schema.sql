-- ============================================================
-- DiagDesk MVP — Simplified Schema (v2)
-- Replaces the over-normalized v1 with 7 flat tables.
-- JSONB embeds items/results to avoid joins on hot paths.
-- ============================================================

-- ── 1. Drop everything from v1 ────────────────────────────────────────────────
DROP TABLE IF EXISTS
  validation, result_value, result,
  report_handover, report_print_log, report_delivery, report,
  sample_event, sample, accession, order_item, "order",
  service_engagement, professional_service_contract,
  b2b_receivable, payment, invoice_line, invoice,
  b2b_account, b2b_partner, referring_doctor,
  expense, expense_category, stock_ledger, test_kit, inventory_item,
  consent,
  rate_card_item, rate_card, health_package_item, health_package,
  panel_item, test_panel, reference_range, test,
  specimen_type, container, nabl_test_catalog, department,
  report_template, report_stationery,
  outbox_event, idempotency_key, notification, audit_log,
  user_permission, role_permission, user_role,
  role, app_user, permission,
  branch, tenant
CASCADE;

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

-- ── 2. Shared trigger ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============================================================
-- TABLE 1: tenants
-- One row per lab / diagnostics centre.
-- ============================================================
CREATE TABLE tenants (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  plan       TEXT        NOT NULL DEFAULT 'starter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 2: users
-- Staff + patient-portal accounts. Role decides what they see.
-- ============================================================
CREATE TABLE users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id),
  name       TEXT        NOT NULL,
  email      TEXT,
  phone      TEXT,
  role       TEXT        NOT NULL DEFAULT 'lab_tech'
                         CHECK (role IN ('admin','doctor','lab_tech','phlebotomist','receptionist','patient')),
  status     TEXT        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','inactive')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE 3: patients
-- ============================================================
CREATE TABLE patients (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id),
  mpi_no     TEXT        NOT NULL,            -- e.g. LAB-2024-00001
  name       TEXT        NOT NULL,
  age        INT,
  sex        TEXT        CHECK (sex IN ('M','F','O')),
  phone      TEXT,
  email      TEXT,
  address    TEXT,
  abha       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_patients_tenant ON patients(tenant_id);
CREATE INDEX idx_patients_phone  ON patients(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX idx_patients_mpi ON patients(tenant_id, mpi_no) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE 4: tests  (catalog / price list)
-- ============================================================
CREATE TABLE tests (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID         NOT NULL REFERENCES tenants(id),
  code       TEXT         NOT NULL,
  name       TEXT         NOT NULL,
  department TEXT         NOT NULL DEFAULT 'General',
  price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  tat_hours  INT          NOT NULL DEFAULT 24,
  active     BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_tests_tenant ON tests(tenant_id);
CREATE UNIQUE INDEX idx_tests_code ON tests(tenant_id, code);
CREATE TRIGGER trg_tests_updated_at BEFORE UPDATE ON tests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE 5: orders
--
-- items JSONB — avoids order_item + result + result_value tables.
-- Schema of each element:
--   {
--     "test_id":    "<uuid>",
--     "test_name":  "CBC",
--     "department": "Haematology",
--     "price":      250.00,
--     "status":     "pending|processing|resulted|validated",
--     "result":     { "values": [{"analyte":"WBC","value":"6.5","unit":"K/uL","flag":"normal"}] },
--     "resulted_at": "2024-01-01T10:00:00Z"
--   }
-- ============================================================
CREATE TABLE orders (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id),
  patient_id      UUID         NOT NULL REFERENCES patients(id),
  assigned_to     UUID         REFERENCES users(id),     -- phlebotomist
  doctor_id       UUID         REFERENCES users(id),     -- requesting doctor
  status          TEXT         NOT NULL DEFAULT 'registered'
                               CHECK (status IN (
                                 'registered','sample_collected','processing',
                                 'resulted','reported','delivered','cancelled'
                               )),
  items           JSONB        NOT NULL DEFAULT '[]',    -- embedded order items + results
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_mode    TEXT         CHECK (payment_mode IN ('cash','upi','card','credit','partial')),
  payment_status  TEXT         NOT NULL DEFAULT 'unpaid'
                               CHECK (payment_status IN ('unpaid','partial','paid')),
  notes           TEXT,
  ordered_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_tenant     ON orders(tenant_id, ordered_at DESC);
CREATE INDEX idx_orders_patient    ON orders(patient_id);
CREATE INDEX idx_orders_assigned   ON orders(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_orders_status     ON orders(tenant_id, status);
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE 6: reports
-- ============================================================
CREATE TABLE reports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id),
  order_id    UUID        NOT NULL REFERENCES orders(id),
  patient_id  UUID        NOT NULL REFERENCES patients(id),
  doctor_id   UUID        REFERENCES users(id),
  status      TEXT        NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','in_review','preliminary','final')),
  pdf_url     TEXT,
  content     JSONB       NOT NULL DEFAULT '{}',  -- structured report data
  version     INT         NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_tenant  ON reports(tenant_id);
CREATE INDEX idx_reports_order   ON reports(order_id);
CREATE INDEX idx_reports_patient ON reports(patient_id);
CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE 7: inventory
-- ============================================================
CREATE TABLE inventory (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL REFERENCES tenants(id),
  name              TEXT         NOT NULL,
  category          TEXT         NOT NULL DEFAULT 'reagent',
  unit              TEXT         NOT NULL DEFAULT 'units',
  qty_on_hand       NUMERIC(10,2) NOT NULL DEFAULT 0,
  reorder_threshold NUMERIC(10,2) NOT NULL DEFAULT 0,
  batch_no          TEXT,
  expiry            DATE,
  supplier          TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX idx_inventory_tenant ON inventory(tenant_id);
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RLS — service role has full access; anon blocked by default.
-- Policies unlock per-role once auth is wired (Phase B).
-- ============================================================
ALTER TABLE tenants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Temporary dev policy: service role bypasses; anon can read own tenant
-- (Replace with JWT-claim policy once Keycloak is wired.)
CREATE POLICY allow_service_role ON tenants   TO service_role USING (true);
CREATE POLICY allow_service_role ON users     TO service_role USING (true);
CREATE POLICY allow_service_role ON patients  TO service_role USING (true);
CREATE POLICY allow_service_role ON tests     TO service_role USING (true);
CREATE POLICY allow_service_role ON orders    TO service_role USING (true);
CREATE POLICY allow_service_role ON reports   TO service_role USING (true);
CREATE POLICY allow_service_role ON inventory TO service_role USING (true);

-- ============================================================
-- SEED DATA — one demo tenant + staff + patients + tests + orders
-- ============================================================

-- Tenant
INSERT INTO tenants (id, name, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Lumina Diagnostics', 'pro');

-- Users (staff)
INSERT INTO users (id, tenant_id, name, email, role) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Dr. Anita Sharma',   'anita.sharma@lumina.in',  'doctor'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Ravi Kumar',         'ravi.kumar@lumina.in',    'phlebotomist'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Priya Nair',         'priya.nair@lumina.in',    'lab_tech'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Admin User',         'admin@lumina.in',         'admin'),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Dr. Suresh Patel',   'suresh.patel@lumina.in',  'doctor');

-- Patients
INSERT INTO patients (id, tenant_id, mpi_no, name, age, sex, phone, email) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'LAB-2024-00001', 'Meera Iyer',       34, 'F', '9876543210', 'meera.iyer@gmail.com'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'LAB-2024-00002', 'Arun Krishnamurthy',42,'M', '9876543211', 'arun.k@gmail.com'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'LAB-2024-00003', 'Sunita Reddy',     28, 'F', '9876543212', 'sunita.r@gmail.com'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'LAB-2024-00004', 'Vikram Singh',     55, 'M', '9876543213', 'vikram.s@gmail.com'),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000001', 'LAB-2024-00005', 'Kavitha Menon',    31, 'F', '9876543214', 'kavitha.m@gmail.com');

-- Tests catalog
INSERT INTO tests (id, tenant_id, code, name, department, price, tat_hours) VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', 'CBC',    'Complete Blood Count',          'Haematology',  350, 4),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'LFT',    'Liver Function Test',           'Biochemistry', 650, 6),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000001', 'KFT',    'Kidney Function Test',          'Biochemistry', 550, 6),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000001', 'LIPID',  'Lipid Profile',                 'Biochemistry', 700, 8),
  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-000000000001', 'TSH',    'Thyroid Stimulating Hormone',   'Endocrinology',500, 12),
  ('00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0000-000000000001', 'URINE',  'Urine Routine & Microscopy',    'Microbiology', 200, 4),
  ('00000000-0000-0000-0002-000000000007', '00000000-0000-0000-0000-000000000001', 'HBA1C',  'Glycated Haemoglobin (HbA1c)',  'Biochemistry', 450, 8),
  ('00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0000-000000000001', 'ECG',    'Electrocardiogram',             'Cardiology',   300, 1),
  ('00000000-0000-0000-0002-000000000009', '00000000-0000-0000-0000-000000000001', 'XRAY',   'X-Ray Chest PA View',           'Radiology',    600, 2),
  ('00000000-0000-0000-0002-000000000010', '00000000-0000-0000-0000-000000000001', 'DENGUE', 'Dengue NS1 Antigen',            'Serology',     800, 6);

-- Orders with embedded items + results
INSERT INTO orders (id, tenant_id, patient_id, assigned_to, doctor_id, status, items, subtotal, discount, total, payment_mode, payment_status, ordered_at) VALUES

-- Order 1: Meera — CBC + LFT, resulted
('00000000-0000-0000-0003-000000000001',
 '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0001-000000000001',
 '00000000-0000-0000-0000-000000000011',
 '00000000-0000-0000-0000-000000000010',
 'resulted',
 '[
   {"test_id":"00000000-0000-0000-0002-000000000001","test_name":"CBC","department":"Haematology","price":350,"status":"resulted",
    "result":{"values":[
      {"analyte":"WBC","value":"7.2","unit":"K/uL","flag":"normal"},
      {"analyte":"RBC","value":"4.8","unit":"M/uL","flag":"normal"},
      {"analyte":"Hgb","value":"13.5","unit":"g/dL","flag":"normal"},
      {"analyte":"Platelets","value":"220","unit":"K/uL","flag":"normal"}
    ]},"resulted_at":"2024-10-24T10:30:00Z"},
   {"test_id":"00000000-0000-0000-0002-000000000002","test_name":"LFT","department":"Biochemistry","price":650,"status":"resulted",
    "result":{"values":[
      {"analyte":"ALT","value":"28","unit":"U/L","flag":"normal"},
      {"analyte":"AST","value":"32","unit":"U/L","flag":"normal"},
      {"analyte":"Bilirubin Total","value":"0.8","unit":"mg/dL","flag":"normal"}
    ]},"resulted_at":"2024-10-24T11:00:00Z"}
 ]'::jsonb,
 1000, 0, 1000, 'upi', 'paid',
 now() - interval '2 hours'),

-- Order 2: Arun — Lipid + HbA1c, processing
('00000000-0000-0000-0003-000000000002',
 '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0001-000000000002',
 '00000000-0000-0000-0000-000000000011',
 '00000000-0000-0000-0000-000000000010',
 'processing',
 '[
   {"test_id":"00000000-0000-0000-0002-000000000004","test_name":"Lipid Profile","department":"Biochemistry","price":700,"status":"processing","result":null},
   {"test_id":"00000000-0000-0000-0002-000000000007","test_name":"HbA1c","department":"Biochemistry","price":450,"status":"processing","result":null}
 ]'::jsonb,
 1150, 0, 1150, 'cash', 'paid',
 now() - interval '1 hour'),

-- Order 3: Sunita — TSH + Urine, sample_collected
('00000000-0000-0000-0003-000000000003',
 '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0001-000000000003',
 '00000000-0000-0000-0000-000000000011',
 '00000000-0000-0000-0000-000000000014',
 'sample_collected',
 '[
   {"test_id":"00000000-0000-0000-0002-000000000005","test_name":"TSH","department":"Endocrinology","price":500,"status":"pending","result":null},
   {"test_id":"00000000-0000-0000-0002-000000000006","test_name":"Urine R/M","department":"Microbiology","price":200,"status":"pending","result":null}
 ]'::jsonb,
 700, 0, 700, null, 'unpaid',
 now() - interval '30 minutes'),

-- Order 4: Vikram — CBC + KFT + Lipid (registered, pending payment)
('00000000-0000-0000-0003-000000000004',
 '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0001-000000000004',
 '00000000-0000-0000-0000-000000000011',
 '00000000-0000-0000-0000-000000000010',
 'registered',
 '[
   {"test_id":"00000000-0000-0000-0002-000000000001","test_name":"CBC","department":"Haematology","price":350,"status":"pending","result":null},
   {"test_id":"00000000-0000-0000-0002-000000000003","test_name":"KFT","department":"Biochemistry","price":550,"status":"pending","result":null},
   {"test_id":"00000000-0000-0000-0002-000000000004","test_name":"Lipid Profile","department":"Biochemistry","price":700,"status":"pending","result":null}
 ]'::jsonb,
 1600, 100, 1500, null, 'unpaid',
 now() - interval '10 minutes'),

-- Order 5: Kavitha — Dengue, reported + delivered
('00000000-0000-0000-0003-000000000005',
 '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0001-000000000005',
 '00000000-0000-0000-0000-000000000011',
 '00000000-0000-0000-0000-000000000014',
 'delivered',
 '[
   {"test_id":"00000000-0000-0000-0002-000000000010","test_name":"Dengue NS1 Antigen","department":"Serology","price":800,"status":"resulted",
    "result":{"values":[
      {"analyte":"NS1 Antigen","value":"Non-Reactive","unit":"","flag":"normal"}
    ]},"resulted_at":"2024-10-23T16:00:00Z"}
 ]'::jsonb,
 800, 0, 800, 'card', 'paid',
 now() - interval '1 day');

-- Report for order 1 (resulted → report generated)
INSERT INTO reports (tenant_id, order_id, patient_id, doctor_id, status, content) VALUES
  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000001',
   '00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0000-000000000010',
   'preliminary',
   '{"remarks":"All values within normal limits. No critical flags.","signed_by":"Dr. Anita Sharma"}');

-- Inventory
INSERT INTO inventory (tenant_id, name, category, unit, qty_on_hand, reorder_threshold, expiry, supplier) VALUES
  ('00000000-0000-0000-0000-000000000001', 'CBC Reagent Kit',       'reagent',    'kits',    18, 5,  '2025-06-30', 'Sysmex India'),
  ('00000000-0000-0000-0000-000000000001', 'LFT Reagent Set',       'reagent',    'kits',     8, 3,  '2025-04-15', 'Beckman Coulter'),
  ('00000000-0000-0000-0000-000000000001', 'Vacutainer EDTA 3mL',   'consumable', 'pieces', 340, 100,'2025-12-31', 'BD India'),
  ('00000000-0000-0000-0000-000000000001', 'Urine Cup 60mL',        'consumable', 'pieces', 210, 50, '2026-01-01', 'Tarsons'),
  ('00000000-0000-0000-0000-000000000001', 'Dengue NS1 Test Kit',   'kit',        'strips',   3, 10, '2025-03-01', 'J. Mitra'),
  ('00000000-0000-0000-0000-000000000001', 'Ethanol 70% 500mL',     'chemical',   'bottles', 12, 4,  '2025-09-30', 'SD Fine Chem'),
  ('00000000-0000-0000-0000-000000000001', 'Latex Gloves (M) Box',  'ppe',        'boxes',    6, 3,  null,         'Ansell'),
  ('00000000-0000-0000-0000-000000000001', 'Surgical Mask Box',     'ppe',        'boxes',   22, 5,  null,         '3M India');
