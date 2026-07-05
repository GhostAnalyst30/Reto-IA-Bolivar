#!/usr/bin/env npx tsx
/**
 * Seed platform admin via Supabase Admin API.
 * Usage: SEED_DEMO_PASSWORD=Immanuel3008 npx tsx scripts/seed-platform-admin.ts
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function loadEnvFile(relativePath: string) {
  const envPath = join(__dirname, relativePath);
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('../apps/web/.env.local');
loadEnvFile('../apps/api/.env');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_DEMO_PASSWORD || 'Immanuel3008';
const email = process.env.PLATFORM_ADMIN_EMAIL || 'ascendraemmanuel@gmail.com';
const username = 'admin';

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
    user_metadata: { full_name: 'Administrador UTB Te acompaña', username },
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
    username,
    full_name: 'Administrador UTB Te acompaña',
    role: 'platform_admin',
    status: 'approved',
    institution_id: null,
  }, { onConflict: 'id' });

  console.log(`OK ${username} (${email}) — platform_admin`);
}

main().catch(console.error);
