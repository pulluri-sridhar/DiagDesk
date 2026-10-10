-- MVP dev mode: allow anon role to read all tables
-- Replace with tenant-scoped JWT policies when auth is wired.
CREATE POLICY allow_anon_read ON tenants   FOR SELECT TO anon USING (true);
CREATE POLICY allow_anon_read ON users     FOR SELECT TO anon USING (true);
CREATE POLICY allow_anon_read ON patients  FOR SELECT TO anon USING (true);
CREATE POLICY allow_anon_read ON tests     FOR SELECT TO anon USING (true);
CREATE POLICY allow_anon_read ON orders    FOR SELECT TO anon USING (true);
CREATE POLICY allow_anon_read ON reports   FOR SELECT TO anon USING (true);
CREATE POLICY allow_anon_read ON inventory FOR SELECT TO anon USING (true);
