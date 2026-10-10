import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

// Fixed demo tenant for MVP (seed data uses this ID)
export const TENANT_ID = '00000000-0000-0000-0000-000000000001';
