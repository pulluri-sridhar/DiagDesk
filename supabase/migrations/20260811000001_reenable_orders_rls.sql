-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260811000001_reenable_orders_rls.sql
--
-- Context:
--   Migration 20260725000001 disabled RLS on `orders` as a temporary workaround
--   because anon INSERT/UPDATE were blocked (no write policies existed yet).
--   The Supabase advisor now flags the mismatch: policies exist but RLS is off,
--   meaning all policies are silently ignored.
--
-- Fix:
--   1. Add the missing anon INSERT and UPDATE policies (idempotent — uses
--      CREATE POLICY IF NOT EXISTS so it's safe even if created via console).
--   2. Re-enable RLS — now all four policies are enforced:
--        allow_anon_read      SELECT for anon
--        anon_insert_orders   INSERT for anon
--        anon_update_orders   UPDATE for anon
--        allow_service_role   ALL    for service_role (backend services)
--
-- Note: The bare GRANT on the table stays — GRANT gives the role permission to
-- touch the table at all; policies then control which rows. Both are required.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add missing write policies for anon (safe to run even if already present)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders' AND policyname = 'anon_insert_orders'
  ) THEN
    EXECUTE 'CREATE POLICY anon_insert_orders ON orders FOR INSERT TO anon WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders' AND policyname = 'anon_update_orders'
  ) THEN
    EXECUTE 'CREATE POLICY anon_update_orders ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
END;
$$;

-- 2. Re-enable RLS — policies are now enforced on every query

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
