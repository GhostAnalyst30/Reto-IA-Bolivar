/**
 * Computes risk reports for UTB demo using the real Python risk engine.
 * Usage: API_URL=http://localhost:8000 INTERNAL_CRON_TOKEN=... npx tsx scripts/compute-risk-demo.ts
 *
 * Requires a running API and an institutional/platform admin session token,
 * OR set CRON path via service role proxy. Simpler: calls admin cron if CRON_SECRET is set.
 */
const UTB_INST = 'a0000000-0000-4000-8000-000000000001';

async function main() {
  const apiUrl = process.env.API_URL || 'http://localhost:8000';
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const res = await fetch(`${apiUrl}/admin/cron/recompute-risk`, {
      method: 'POST',
      headers: { 'x-cron-secret': cronSecret },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Cron recompute failed:', data);
      process.exit(1);
    }
    console.log(`Risk reports computed via API: ${data.computed} students (UTB ${UTB_INST})`);
    return;
  }

  console.error(
    'Set CRON_SECRET (matching apps/api/.env) to use the real risk engine via POST /admin/cron/recompute-risk'
  );
  process.exit(1);
}

main().catch(console.error);
