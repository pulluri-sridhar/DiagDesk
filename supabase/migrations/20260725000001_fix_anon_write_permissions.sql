-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260725000001_fix_anon_write_permissions.sql
--
-- Context:
--   The original schema (00002) created tables with RLS enabled and only
--   service_role having write access.  Migration 00003 added SELECT policies
--   for the anon role, but INSERT / UPDATE / DELETE were still blocked.
--   The frontend uses the anon (publishable) key, so every write from
--   PatientRegistration, PhlebotomistMobile, and ReportManager was returning
--   401 / 403.
--
-- Changes in this migration:
--   1. Disable RLS on the three tables the frontend writes to (patients,
--      orders, reports) — appropriate for MVP / single-tenant dev mode.
--      When real multi-tenant auth is wired, re-enable RLS and replace
--      these with tenant-scoped JWT policies.
--   2. Grant full DML (INSERT / UPDATE / DELETE / SELECT) to the anon role
--      on those tables.
--   3. Add a `barcode` column to orders (used by the barcode-print feature
--      in PhlebotomistMobile; the column is referenced by api.saveOrderBarcode
--      and silently skipped when absent, so this makes it permanent).
--
-- Rollback:
--   ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE reports  ENABLE ROW LEVEL SECURITY;
--   REVOKE INSERT, UPDATE, DELETE ON TABLE patients FROM anon;
--   REVOKE INSERT, UPDATE, DELETE ON TABLE orders   FROM anon;
--   REVOKE INSERT, UPDATE, DELETE ON TABLE reports  FROM anon;
--   ALTER TABLE orders DROP COLUMN IF EXISTS barcode;
-- ─────────────────────────────────────────────────────────────────────────────


-- 1. Disable row-level security on tables written by the frontend ─────────────

ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders   DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports  DISABLE ROW LEVEL SECURITY;


-- 2. Grant full DML to the anon role ─────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE patients  TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE orders    TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE reports   TO anon;


-- 3. Barcode column on orders (PhlebotomistMobile barcode-print feature) ──────

ALTER TABLE orders ADD COLUMN IF NOT EXISTS barcode TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: reports.status CHECK constraint
--
-- The constraint defined in 20260724000002_simplify_schema.sql is:
--   CHECK (status IN ('draft','in_review','preliminary','final'))
--
-- The frontend code was previously sending 'pending_review' / 'signed' /
-- 'rejected' — all of which violated this constraint (causing 400 errors).
-- The code has been fixed (see frontend/src/lib/api.ts and ReportManager.tsx)
-- to use the correct DB values:
--   'pending_review' → 'in_review'
--   'signed'         → 'final'
--   'rejected'       → 'draft'  (rejection reason stored in content JSONB)
--
-- No constraint change is needed here; the original constraint is correct.
-- ─────────────────────────────────────────────────────────────────────────────
