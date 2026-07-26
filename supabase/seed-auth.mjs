/**
 * DiagDesk — Auth User Seeder
 * Uses supabase.auth.admin.createUser() (requires service role key)
 *
 * Usage:
 *   1. Get your service role key from:
 *      Supabase Dashboard → Settings → API → service_role (secret)
 *   2. Run:
 *      SUPABASE_SERVICE_KEY=sb_secret_xxx node supabase/seed-auth.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eahvsmbggamertymxukm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌  Set SUPABASE_SERVICE_KEY=sb_secret_... before running.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: 'admin@lumina.com',        password: 'Demo@1234', role: 'admin',        name: 'Admin User'       },
  { email: 'anita.sharma@lumina.com', password: 'Demo@1234', role: 'doctor',       name: 'Dr. Anita Sharma' },
  { email: 'ravi.kumar@lumina.com',   password: 'Demo@1234', role: 'phlebotomist', name: 'Ravi Kumar'       },
  { email: 'meera.iyer@lumina.com',   password: 'Demo@1234', role: 'patient',      name: 'Meera Iyer'       },
];

console.log('Creating DiagDesk demo auth users…\n');

for (const u of USERS) {
  const { data, error } = await supabase.auth.admin.createUser({
    email:          u.email,
    password:       u.password,
    email_confirm:  true,           // skip email verification for demo
    user_metadata:  { role: u.role, name: u.name },
  });

  if (error) {
    if (error.message.includes('already been registered')) {
      console.log(`⚠️  ${u.email} already exists — skipping`);
    } else {
      console.error(`❌  ${u.email}: ${error.message}`);
    }
  } else {
    console.log(`✅  ${u.email}  (${u.role})  id=${data.user.id}`);
  }
}

console.log('\nDone. All demo users password: Demo@1234');
