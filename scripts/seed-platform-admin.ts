#!/usr/bin/env npx tsx
/**
 * Seed platform admin via Supabase Admin API.
 * Usage: SEED_DEMO_PASSWORD=Demo2026! npx tsx scripts/seed-platform-admin.ts
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_DEMO_PASSWORD || 'Demo2026!';
const email = 'admin@bolivar.ia.com';

async function main() {
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Administrador Bolívar IA' },
  });

  let userId = data.user?.id;
  if (error?.message?.includes('already')) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = list.users.find((x) => x.email === email)?.id;
  } else if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  if (!userId) {
    console.error('No user id');
    process.exit(1);
  }

  await admin.from('users').upsert({
    id: userId,
    email,
    full_name: 'Administrador Bolívar IA',
    role: 'platform_admin',
    status: 'approved',
    institution_id: null,
  }, { onConflict: 'id' });

  console.log(`OK ${email} (platform_admin)`);
}

main().catch(console.error);
