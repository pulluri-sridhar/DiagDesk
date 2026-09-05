-- Purchase Requisitions table (fronts for POST /v1/inventory/purchase-requisitions)
-- until the Inventory microservice is built, the React frontend writes here directly.

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID         NOT NULL REFERENCES tenants(id),
  req_number    TEXT         NOT NULL,          -- e.g. PR-2026-00001
  status        TEXT         NOT NULL DEFAULT 'draft',  -- draft|submitted|approved|ordered|received
  notes         TEXT,
  items         JSONB        NOT NULL DEFAULT '[]',
  -- items structure:
  -- [{ inventory_id, name, supplier, unit, qty_on_hand, reorder_threshold, qty_to_order }]
  created_by    UUID         REFERENCES users(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_service_role ON purchase_requisitions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY allow_anon_read ON purchase_requisitions
  FOR SELECT TO anon USING (true);

CREATE POLICY allow_anon_insert ON purchase_requisitions
  FOR INSERT TO anon WITH CHECK (true);
