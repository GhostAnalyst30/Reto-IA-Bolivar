#!/usr/bin/env npx tsx
/**
 * Seed UTB demo users via Supabase Admin API.
 * Usage: SEED_DEMO_PASSWORD=Demo2026! npx tsx scripts/seed-utb-users.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env (apps/web/.env.local)
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultPassword = process.env.SEED_DEMO_PASSWORD || 'Demo2026!';

const UTB_INSTITUTION = 'a0000000-0000-4000-8000-000000000001';
const ENGINEERING_FACULTY = 'b0000000-0000-4000-8000-000000000001';

const USERS: { email: string; role: string; full_name: string; faculty_id?: string; password?: string }[] = [
  { email: 'admin.demo@utb.edu.co', role: 'admin', full_name: 'Admin UTB' },
  { email: 'rector.demo@utb.edu.co', role: 'rector', full_name: 'Rector UTB' },
  { email: 'vicerrector.demo@utb.edu.co', role: 'vice_president', full_name: 'Vicerrector UTB' },
  { email: 'decano.demo@utb.edu.co', role: 'dean', full_name: 'Decano UTB', faculty_id: ENGINEERING_FACULTY },
  { email: 'director.demo@utb.edu.co', role: 'area_head', full_name: 'Director de Programa UTB', faculty_id: ENGINEERING_FACULTY },
  { email: 'psicologo.demo@utb.edu.co', role: 'admin', full_name: 'Lic. María Fernanda Ortiz' },
  ...Array.from({ length: 10 }, (_, i) => ({
    email: `estudiante${String(i + 1).padStart(2, '0')}.demo@utb.edu.co`,
    role: 'student',
    full_name: `Estudiante Demo ${i + 1}`,
  })),
];

async function main() {
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  for (const u of USERS) {
    const password = u.password || process.env[`SEED_${u.role.toUpperCase()}_PASSWORD`] || defaultPassword;
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });

    let userId = data.user?.id;
    if (error?.message?.includes('already')) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId = list.users.find((x) => x.email === u.email)?.id;
    } else if (error) {
      console.warn(`Skip ${u.email}:`, error.message);
      continue;
    }

    if (!userId) continue;

    await admin.from('users').upsert({
      id: userId,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      status: 'approved',
      institution_id: UTB_INSTITUTION,
      faculty_id: u.faculty_id || null,
    }, { onConflict: 'id' });

    console.log(`OK ${u.email} (${u.role})`);
  }
}

main().catch(console.error);
