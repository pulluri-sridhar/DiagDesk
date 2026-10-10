-- Create Supabase Auth users for DiagDesk demo accounts.
-- Run this in Supabase → SQL Editor.
-- Password for all accounts: Demo@1234

INSERT INTO auth.users (
  instance_id, id, aud, role,
  email, encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at, updated_at
)
SELECT
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated',
  v.email, crypt('Demo@1234', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  v.meta::jsonb,
  now(), now()
FROM (VALUES
  ('admin@lumina.com',        '{"role":"admin","name":"Admin User"}'),
  ('anita.sharma@lumina.com', '{"role":"doctor","name":"Dr. Anita Sharma"}'),
  ('ravi.kumar@lumina.com',   '{"role":"phlebotomist","name":"Ravi Kumar"}'),
  ('meera.iyer@lumina.com',   '{"role":"patient","name":"Meera Iyer"}')
) AS v(email, meta)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.email = v.email
);

-- Insert identity records so Supabase auth provider tracking works.
-- NOT EXISTS avoids ON CONFLICT constraint-name issues entirely.
INSERT INTO auth.identities (
  id, user_id, provider_id, provider,
  identity_data, last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.email,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  now(), now(), now()
FROM auth.users u
WHERE u.email IN (
  'admin@lumina.com',
  'anita.sharma@lumina.com',
  'ravi.kumar@lumina.com',
  'meera.iyer@lumina.com'
)
AND NOT EXISTS (
  SELECT 1 FROM auth.identities i
  WHERE i.provider = 'email'
    AND i.provider_id = u.email
);
